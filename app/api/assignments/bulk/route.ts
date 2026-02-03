export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * POST /api/assignments/bulk
 * Assign shifts to multiple employees
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { employees, shiftType, shiftId, startDate, endDate, mode } = body

    // Validate input
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees provided' },
        { status: 400 }
      )
    }

    if (mode !== 'unassign') {
      if (!shiftType || !['fixed', 'rotation'].includes(shiftType)) {
        return NextResponse.json(
          { success: false, error: 'Invalid shift type. Must be "fixed" or "rotation"' },
          { status: 400 }
        )
      }

      if (!shiftId) {
        return NextResponse.json(
          { success: false, error: 'Shift ID is required' },
          { status: 400 }
        )
      }
    }

    if (!startDate) {
      return NextResponse.json(
        { success: false, error: 'Start date is required' },
        { status: 400 }
      )
    }

    // Aggressively close/invalidate ANY existing assignment that would overlap with the new one
    // Strategy:
    // 1. If an assignment STARTS on or after the new Start Date, DELETE it (it's entirely replaced).
    // 2. If an assignment STARTS before but ENDS after (or is open), CLIP it to end the day before new Start Date.

    // Step 1: Delete ALL future assignments that start on or after the unassign date
    const { error: deleteError } = await supabase
      .from('employee_shift_assignments')
      .delete()
      .in('employee_code', employees)
      .gte('start_date', startDate)

    if (deleteError) {
      console.error(`[Unassign] Error deleting future assignments for ${employees}:`, deleteError)
    } else {
      console.log(`[Unassign] Deleted future assignments for ${employees} from ${startDate}`)
    }

    // Step 2: Close overlapping open/long assignments
    // Set End Date to (StartDate - 1 Day)
    const yesterday = new Date(new Date(startDate).setDate(new Date(startDate).getDate() - 1)).toISOString().split('T')[0]

    // FETCH IDs first to be absolutely sure what we are updating
    const { data: assignmentsToClose } = await supabase
      .from('employee_shift_assignments')
      .select('id')
      .in('employee_code', employees)
      .lt('start_date', startDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`)

    if (assignmentsToClose && assignmentsToClose.length > 0) {
      const idsToClose = assignmentsToClose.map(a => a.id);
      const { error: closeError } = await supabase
        .from('employee_shift_assignments')
        .update({ end_date: yesterday })
        .in('id', idsToClose)

      if (closeError) {
        console.error(`[Unassign] Error closing previous assignments for ${employees}:`, closeError)
      } else {

      }
    } else {

    }

    if (mode === 'unassign') {
      // Step 3 (Optional): Delete any residual daily schedule from the assignment start date onwards
      const { error: dailyDeleteError } = await supabase
        .from('employee_daily_schedule')
        .delete()
        .in('employee_code', employees)
        .gte('work_date', startDate)

      if (dailyDeleteError) {
        console.error('Error deleting daily schedule for unassignment:', dailyDeleteError)
      }

      // Create audit log for unassignment
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'shift_assignment_unassign',
        meta_json: {
          employee_count: employees.length,
          start_date: startDate
        }
      })

      return NextResponse.json({
        success: true,
        message: `Successfully unassigned shifts from ${employees.length} employee(s)`,
        count: employees.length
      })
    }

    // Create new assignments - both fixed and rotation reference shift_templates
    const assignments = employees.map((employeeCode: string) => ({
      employee_code: employeeCode,
      assignment_type: shiftType,
      shift_template_id: shiftId,
      rotation_profile_id: null,
      start_date: startDate,
      end_date: endDate || null,
      created_by: user.id
    }))

    const { data, error } = await supabase
      .from('employee_shift_assignments')
      .insert(assignments)
      .select()

    if (error) {
      console.error('Error creating assignments:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create shift assignments', details: error.message },
        { status: 500 }
      )
    }

    // --- Generate Daily Schedules ---
    try {
      // 1. Fetch Shift Template details
      const { data: template, error: templateError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', shiftId)
        .single()

      if (templateError || !template) {
        console.error('Error fetching shift template for daily gen:', templateError)
        // Don't fail the whole request, but log it. 
        // Or maybe we should? The user expects the calendar to work.
      } else {
        const dailyRecords: any[] = []
        const start = new Date(startDate)
        // Default window: 365 days (1 year) for all shifts if no end date provided
        const defaultDays = 365
        const end = endDate ? new Date(endDate) : new Date(start.getTime() + defaultDays * 24 * 60 * 60 * 1000)

        // Prepare rotation data if needed
        let rotationPattern: any[] = []
        let rotationWeeks = 1
        let rotationShiftMap = new Map<string, any>()

        if (shiftType === 'rotation') {
          // Attempt to fetch from new normalized table first
          const { data: steps } = await supabase
            .from('shift_rotation_steps')
            .select('*')
            .eq('template_id', shiftId)
            .order('step_order', { ascending: true })

          if (steps && steps.length > 0) {

            rotationPattern = steps
            rotationWeeks = steps.length
          } else {

            rotationPattern = Array.isArray(template.pattern) ? template.pattern : []
            rotationWeeks = template.weeks_pattern || rotationPattern.length || 1
          }

          // Fetch base shifts referenced in the pattern
          const shiftNames = Array.from(new Set(
            rotationPattern.map((p: any) => p?.shift_name).filter((n: any) => !!n)
          )) as string[]

          if (shiftNames.length > 0) {
            const { data: baseShifts } = await supabase
              .from('shift_templates')
              .select('*')
              .in('name', shiftNames)

            if (baseShifts) {
              rotationShiftMap = new Map(baseShifts.map(s => [s.name, s]))
            }
          }
        }

        // Loop through dates
        // Zero-Migration Fix: Check pattern.work_days (Fixed) or default
        const globalActiveDays = template.pattern?.work_days || template.work_days || [0, 1, 2, 3, 4, 5, 6]

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]

          let currentShiftId = shiftId
          let shiftName = template.name
          let shiftStart = template.start_time
          let shiftEnd = template.end_time
          let color = template.color
          let overnight = template.overnight
          let graceMinutes = template.grace_minutes
          let currentActiveDays = globalActiveDays

          if (shiftType === 'rotation' && rotationPattern.length > 0) {
            // Apply Rotation Logic
            const daysDiff = Math.floor((d.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
            const weekIndex = Math.floor(daysDiff / 7) % rotationWeeks
            const weekPattern = rotationPattern[weekIndex]

            // Check for week-specific active days
            if (weekPattern?.work_days) {
              currentActiveDays = weekPattern.work_days
            }

            // Priority 1: Base Shift Lookup
            if (weekPattern?.shift_name) {
              const baseShift = rotationShiftMap.get(weekPattern.shift_name)
              if (baseShift) {
                currentShiftId = baseShift.id
                shiftName = baseShift.name
                shiftStart = baseShift.start_time
                shiftEnd = baseShift.end_time
                color = baseShift.color
                overnight = baseShift.overnight
                graceMinutes = baseShift.grace_minutes

              } else {
                console.warn(`[RotationDecision] Base shift '${weekPattern.shift_name}' not found for ${dateStr}. Checking inline times...`)
                // Fallback if name provided but not found in map (should unlikely happen if rotationShiftMap built correctly)
                // But if we have inline times, use them
                if (weekPattern?.start_time && weekPattern?.end_time) {
                  shiftStart = weekPattern.start_time
                  shiftEnd = weekPattern.end_time
                  shiftName = weekPattern.shift_name || shiftName

                  // Keep default color/overnight from template unless specified? 
                  // Usually ad-hoc patterns might verify this.
                } else {
                  console.error(`[RotationDecision] FAILED to resolve shift for ${dateStr}. Defaulting to template metrics but this may be 00:00!`)
                }
              }
            } else if (weekPattern?.start_time && weekPattern?.end_time) {
              // Priority 2: Inline Ad-Hoc Times (No shift_name link)
              shiftStart = weekPattern.start_time
              shiftEnd = weekPattern.end_time
              shiftName = weekPattern.custom_name || template.name // Or "Ad-hoc Shift"

            }
          }

          // validation check
          if (!currentActiveDays.includes(d.getDay())) {
            continue; // Skip off days
          }

          // Add record for each employee...

          // Add record for each employee
          employees.forEach(empCode => {
            dailyRecords.push({
              employee_code: empCode,
              work_date: dateStr,
              shift_name: shiftName,
              shift_start: shiftStart,
              shift_end: shiftEnd,
              color: color,
              overnight: overnight,
              grace_minutes: graceMinutes
            })
          })
        }

        // Batch insert daily records
        // Using upsert to avoid duplicates if re-running
        if (dailyRecords.length > 0) {
          const { error: dailyError } = await supabase
            .from('employee_daily_schedule')
            .upsert(dailyRecords, { onConflict: 'employee_code,work_date' })

          if (dailyError) {
            console.error('Error generating daily schedules:', dailyError)
          }
        }
      }
    } catch (genError) {
      console.error('Exception generating daily schedules:', genError)
    }
    // --------------------------------

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'shift_assignment_bulk',
      meta_json: {
        employee_count: employees.length,
        shift_type: shiftType,
        shift_id: shiftId,
        start_date: startDate,
        end_date: endDate
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully assigned shifts to ${employees.length} employee(s)`,
      data: data,
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Error in bulk assignment API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/assignments/bulk
 * Get all shift assignments
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employee_code')

    let query = supabase
      .from('employee_shift_assignments')
      .select(`
        *,
        shift_template:shift_templates(id, name, start_time, end_time, overnight, color)
      `)
      .order('created_at', { ascending: false })

    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Error in get assignments API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
