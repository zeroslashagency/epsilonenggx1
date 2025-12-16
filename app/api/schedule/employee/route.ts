export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/schedule/employee
 * Get employee schedule for a date range
 * Query params: employee_code, from (date), to (date)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employee_code')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!employeeCode) {
      return NextResponse.json(
        { success: false, error: 'employee_code is required' },
        { status: 400 }
      )
    }

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'from and to dates are required' },
        { status: 400 }
      )
    }

    // Fetch ALL matching assignments to handle transitions correctly
    const { data: assignments, error: assignmentError } = await supabase
      .from('employee_shift_assignments')
      .select(`
        *,
        shift_template:shift_templates(*)
      `)
      .eq('employee_code', employeeCode)
      .lte('start_date', toDate)
      .or(`end_date.is.null,end_date.gte.${fromDate}`)
      .order('start_date', { ascending: true }) // Oldest first, so we can layer them if needed

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shift assignments' },
        { status: 500 }
      )
    }

    // Pre-fetch rotation base shifts for ALL assignments to be safe
    const allRotationPatterns = assignments
      ?.filter((a: any) => a.assignment_type === 'rotation' && a.shift_template)
      .map((a: any) => a.shift_template.pattern || [])
      .flat() || []
      
    const shiftNames = Array.from(new Set(
        allRotationPatterns.map((p: any) => p?.shift_name).filter((n: any) => !!n)
    )) as string[]

    const rotationShiftMap = new Map<string, any>()
    if (shiftNames.length > 0) {
        const { data: baseShifts } = await supabase
          .from('shift_templates')
          .select('*')
          .in('name', shiftNames)
        if (baseShifts) {
             baseShifts.forEach((s: any) => rotationShiftMap.set(s.name, s))
        }
    }

    const schedule: any[] = []
    const start = new Date(fromDate)
    const end = new Date(toDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      
      // Find the assignment that is ACTIVE for this date
      // If multiple overlap, pick the one with the LATEST start_date, then LATEST created_at
      // 0. FETCH HOLIDAYS (Global)
      // Heuristic: Get the most recent active "Advanced Settings" from dashboard_data
      // This allows the Employee View to respect the "Holiday Calendar" set by Admins.
      const { data: settingsData } = await supabase
        .from('dashboard_data')
        .select('machine_data')
        .eq('timeline_view', 'advanced_settings')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      const holidays = settingsData?.[0]?.machine_data?.holidays || []
    
    // ... existing activeAssignment logic ...

      const activeAssignment = (assignments || [])
        .filter((a: any) => dateStr >= a.start_date && (!a.end_date || dateStr <= a.end_date))
        .sort((a: any, b: any) => {
             // Priority 1: Most recently created
             if (b.created_at !== a.created_at) {
                 return b.created_at > a.created_at ? 1 : -1
             }
             // Priority 2: Later start date
             return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        })[0]

      if (!activeAssignment) continue

      // 1. CHECK PUBLIC HOLIDAYS
      // Check if current date falls within any defined public holiday
      // Holidays are stored as ISO strings with times, we compare local dates roughly or exact overlaps
      const isPublicHoliday = holidays.some((h: any) => {
          const hStart = new Date(h.startDateTime).toISOString().split('T')[0]
          const hEnd = new Date(h.endDateTime).toISOString().split('T')[0]
          return dateStr >= hStart && dateStr <= hEnd
      })

      if (isPublicHoliday) {
           schedule.push({
               date: dateStr,
               shift_name: 'Public Holiday',
               is_off: true,
               color: '#EF4444', // Red for holiday
               reason: 'Holiday'
           })
           continue
      }

      const assignment = activeAssignment
      let shiftInfo = null

      if (assignment.assignment_type === 'fixed' && assignment.shift_template) {
         // FIXED SHIFT: Check Working Days
         // Fixed patterns store work_days in pattern object: pattern: { work_days: [1,2,3,4,5] }
         const t = assignment.shift_template
         const workDays = t.pattern?.work_days || t.work_days || [0, 1, 2, 3, 4, 5, 6] // Default all days if missing
         const currentDayOfWeek = new Date(dateStr).getDay() // 0 = Sunday

         if (!workDays.includes(currentDayOfWeek)) {
             // Weekly Off
             schedule.push({
               date: dateStr,
               shift_name: 'Weekly Off',
               is_off: true,
               color: '#9CA3AF' // Gray
             })
             continue
         }

        shiftInfo = {
          date: dateStr,
          shift_name: t.name,
          start_time: t.start_time,
          end_time: t.end_time,
          overnight: t.overnight,
          color: t.color,
          grace_minutes: t.grace_minutes
        }
      } else if (assignment.assignment_type === 'rotation' && assignment.shift_template) {
         const pattern = Array.isArray(assignment.shift_template.pattern) ? assignment.shift_template.pattern : []
         const weeks = assignment.shift_template.weeks_pattern || pattern.length || 1
         
         const assignmentStart = new Date(assignment.start_date)
         const daysDiff = Math.floor((date.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24))
         const weekIndex = Math.floor(daysDiff / 7) % weeks
         const weekPattern = pattern[weekIndex]

          // Logic: Try to find a linked Base Shift first. If not found, check if the pattern itself has time data (Ad-hoc).
          const baseShift = weekPattern.shift_name ? rotationShiftMap.get(weekPattern.shift_name) : null
          
          // Determine source of truth: Base Template > Ad-hoc Pattern
          const source = baseShift || (weekPattern.start_time && weekPattern.end_time ? weekPattern : null)

          if (source) {
               // ROTATION SHIFT: Check Working Days
               // Rotation steps store work_days inline: { work_days: [1,2,3,4,5], ... }
               // Use weekPattern.work_days if ad-hoc, or baseShift might NOT have it (usually ad-hoc stores it)
               // The UI (Shift Manager) stores work_days in text for Rotations.
               const workDays = weekPattern.work_days || [0, 1, 2, 3, 4, 5, 6]
               const currentDayOfWeek = new Date(dateStr).getDay()

               if (!workDays.includes(currentDayOfWeek)) {
                    schedule.push({
                       date: dateStr,
                       shift_name: 'Weekly Off',
                       is_off: true,
                       color: '#9CA3AF'
                    })
                    continue
               }

               shiftInfo = {
                date: dateStr,
                // For ad-hoc, use query-friendly text or the label
                shift_name: baseShift ? baseShift.name : (weekPattern.shift_name || 'Shift'),
                start_time: source.start_time,
                end_time: source.end_time,
                // Ad-hoc usually lacks advanced fields, use defaults
                overnight: source.overnight || false,
                color: source.color || '#8B5CF6', // Purple-ish default for rotations
                grace_minutes: source.grace_minutes || 0,
                rotation_week: weekIndex + 1
              }
          }
      }

      if (shiftInfo) schedule.push(shiftInfo)
    }

    return NextResponse.json({
      success: true,
      data: {
        employee_code: employeeCode,
        // Return the latest assignment metadata (last in the sorted list)
        assignment: assignments && assignments.length > 0 ? {
            id: assignments[assignments.length - 1].id,
            type: assignments[assignments.length - 1].assignment_type,
            start_date: assignments[assignments.length - 1].start_date,
            end_date: assignments[assignments.length - 1].end_date,
            shift_template: assignments[assignments.length - 1].shift_template
        } : null,
        schedule: schedule
      }
    })


  } catch (error: any) {
    console.error('Error in employee schedule API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
