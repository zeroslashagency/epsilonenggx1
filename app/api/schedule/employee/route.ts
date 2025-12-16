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
      const activeAssignment = (assignments || [])
        .filter((a: any) => dateStr >= a.start_date && (!a.end_date || dateStr <= a.end_date))
        .sort((a: any, b: any) => {
             // Priority 1: Most recently created (The "Correction" or "New Plan" principle)
             if (b.created_at !== a.created_at) {
                 return b.created_at > a.created_at ? 1 : -1
             }
             // Priority 2: Later start date (if created same time)
             return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        })[0]

      if (!activeAssignment) continue

      const assignment = activeAssignment
      let shiftInfo = null

      if (assignment.assignment_type === 'fixed' && assignment.shift_template) {
        shiftInfo = {
          date: dateStr,
          shift_name: assignment.shift_template.name,
          start_time: assignment.shift_template.start_time,
          end_time: assignment.shift_template.end_time,
          overnight: assignment.shift_template.overnight,
          color: assignment.shift_template.color,
          grace_minutes: assignment.shift_template.grace_minutes
        }
      } else if (assignment.assignment_type === 'rotation' && assignment.shift_template) {
         const pattern = Array.isArray(assignment.shift_template.pattern) ? assignment.shift_template.pattern : []
         const weeks = assignment.shift_template.weeks_pattern || pattern.length || 1
         
         const assignmentStart = new Date(assignment.start_date)
         const daysDiff = Math.floor((date.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24))
         const weekIndex = Math.floor(daysDiff / 7) % weeks
         const weekPattern = pattern[weekIndex]

         if (weekPattern?.shift_name) {
            const baseShift = rotationShiftMap.get(weekPattern.shift_name)
            if (baseShift) {
                 shiftInfo = {
                  date: dateStr,
                  shift_name: baseShift.name,
                  start_time: baseShift.start_time,
                  end_time: baseShift.end_time,
                  overnight: baseShift.overnight,
                  color: baseShift.color,
                  grace_minutes: baseShift.grace_minutes,
                  rotation_week: weekIndex + 1
                }
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
