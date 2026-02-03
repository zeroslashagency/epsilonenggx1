export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/attendance/employee
 * Get employee attendance for a date range with shift comparison
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

    // Get attendance logs for date range
    // db schema: log_date (timestamp), punch_direction (in/out)
    const { data: logs, error: logsError } = await supabase
      .from('employee_raw_logs')
      .select('*')
      .eq('employee_code', employeeCode)
      .gte('log_date', fromDate)
      .lte('log_date', toDate)
      .order('log_date', { ascending: true })

    if (logsError) {
      console.error('Error fetching attendance logs:', logsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attendance data' },
        { status: 500 }
      )
    }

    // Group logs by date and calculate daily summary
    const dailyAttendance = new Map()

    logs?.forEach((log: any) => {
      // log_date is "YYYY-MM-DD HH:mm:ss"
      const [datePart, timePart] = log.log_date ? log.log_date.split(' ') : [null, null]
      
      if (!datePart) return

      if (!dailyAttendance.has(datePart)) {
        dailyAttendance.set(datePart, {
          date: datePart,
          punches: [],
          first_in: null,
          last_out: null,
          total_punches: 0
        })
      }

      const dayData = dailyAttendance.get(datePart)
      const time = timePart || '00:00:00'
      
      dayData.punches.push({
        time: time,
        type: log.punch_direction || 'unknown'
      })
      dayData.total_punches++

      // Track first check-in and last check-out
      if (!dayData.first_in || time < dayData.first_in) {
        dayData.first_in = time
      }
      if (!dayData.last_out || time > dayData.last_out) {
        dayData.last_out = time
      }
    })

    // Convert map to array
    const attendance = Array.from(dailyAttendance.values())

    return NextResponse.json({
      success: true,
      data: {
        employee_code: employeeCode,
        from_date: fromDate,
        to_date: toDate,
        attendance: attendance,
        total_days: attendance.length
      }
    })

  } catch (error: any) {
    console.error('Error in employee attendance API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
