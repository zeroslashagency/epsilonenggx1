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

    // Get current shift assignment for employee
    const { data: assignment, error: assignmentError } = await supabase
      .from('employee_shift_assignments')
      .select(`
        *,
        shift_template:shift_templates(*)
      `)
      .eq('employee_code', employeeCode)
      .lte('start_date', toDate)
      .or(`end_date.is.null,end_date.gte.${fromDate}`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (assignmentError && assignmentError.code !== 'PGRST116') {
      console.error('Error fetching assignment:', assignmentError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shift assignment' },
        { status: 500 }
      )
    }

    // If no assignment found, return empty schedule
    if (!assignment) {
      return NextResponse.json({
        success: true,
        data: {
          employee_code: employeeCode,
          assignment: null,
          schedule: []
        }
      })
    }

    // Prepare rotation metadata if needed
    let rotationPattern: any[] = []
    let rotationWeeks = 0
    let rotationShiftMap = new Map<string, any>()

    if (assignment.assignment_type === 'rotation' && assignment.shift_template) {
      const pattern = Array.isArray(assignment.shift_template.pattern) ? assignment.shift_template.pattern : []
      rotationPattern = pattern
      rotationWeeks = assignment.shift_template.weeks_pattern || pattern.length || 1

      const shiftNames = Array.from(new Set(
        pattern.map((p: any) => p?.shift_name).filter((n: any) => !!n)
      ))

      if (shiftNames.length > 0) {
        const { data: baseShifts, error: baseError } = await supabase
          .from('shift_templates')
          .select('*')
          .in('name', shiftNames)

        if (baseError) {
          console.error('Error fetching base shifts for rotation:', baseError)
        }

        rotationShiftMap = new Map(
          (baseShifts || []).map((t: any) => [t.name, t])
        )
      }
    }

    // Generate daily schedule based on assignment type
    const schedule = []
    const start = new Date(fromDate)
    const end = new Date(toDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      
      // Skip if before assignment start date
      if (dateStr < assignment.start_date) continue
      
      // Skip if after assignment end date (if set)
      if (assignment.end_date && dateStr > assignment.end_date) continue

      let shiftInfo = null

      if (assignment.assignment_type === 'fixed' && assignment.shift_template) {
        // Fixed shift - same every day
        shiftInfo = {
          date: dateStr,
          shift_name: assignment.shift_template.name,
          start_time: assignment.shift_template.start_time,
          end_time: assignment.shift_template.end_time,
          overnight: assignment.shift_template.overnight,
          color: assignment.shift_template.color,
          grace_minutes: assignment.shift_template.grace_minutes
        }
      } else if (assignment.assignment_type === 'rotation' && rotationPattern.length > 0 && rotationWeeks > 0) {
        // Rotation - calculate which week we're in using rotation template pattern
        const assignmentStart = new Date(assignment.start_date)
        const daysDiff = Math.floor((date.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24))
        const weekIndex = Math.floor(daysDiff / 7) % rotationWeeks
        const weekPattern = rotationPattern[weekIndex]

        if (weekPattern && weekPattern.shift_name) {
          const shiftTemplate = rotationShiftMap.get(weekPattern.shift_name)

          if (shiftTemplate) {
            shiftInfo = {
              date: dateStr,
              shift_name: shiftTemplate.name,
              start_time: shiftTemplate.start_time,
              end_time: shiftTemplate.end_time,
              overnight: shiftTemplate.overnight,
              color: shiftTemplate.color,
              grace_minutes: shiftTemplate.grace_minutes,
              rotation_week: weekIndex + 1
            }
          }
        }
      }

      if (shiftInfo) {
        schedule.push(shiftInfo)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        employee_code: employeeCode,
        assignment: {
          id: assignment.id,
          type: assignment.assignment_type,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
          shift_template: assignment.shift_template,
          rotation_profile: assignment.assignment_type === 'rotation' ? assignment.shift_template : null
        },
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
