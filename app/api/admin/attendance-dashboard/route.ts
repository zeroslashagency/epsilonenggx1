import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/services/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get daily attendance summary
    const { data: dailyAttendance, error: dailyError } = await supabase
      .from('employee_daily_attendance')
      .select('*')
      .eq('attendance_date', date)
      .order('employee_code')

    if (dailyError) throw dailyError

    // Get raw logs for the day
    const { data: rawLogs, error: rawError } = await supabase
      .from('employee_raw_logs')
      .select('*')
      .gte('log_date', `${date} 00:00:00`)
      .lt('log_date', `${date} 23:59:59`)
      .order('log_date', { ascending: false })
      .limit(100)

    if (rawError) throw rawError

    // Get employee master data (fallback to existing table)
    const { data: employees, error: empError } = await supabase
      .from('employee_master')
      .select('*')
      .order('employee_code')

    if (empError) throw empError

    // Get device status
    const { data: deviceStatus, error: deviceError } = await supabase
      .from('device_status')
      .select('*')
      .single()

    // Calculate statistics
    const totalEmployees = employees?.length || 0
    const presentToday = dailyAttendance?.filter(att => att.status === 'present').length || 0
    const absentToday = totalEmployees - presentToday
    const totalLogsToday = rawLogs?.length || 0
    
    const avgHours = dailyAttendance?.length > 0 
      ? (dailyAttendance.reduce((sum, att) => sum + (att.total_hours || 0), 0) / dailyAttendance.length).toFixed(2)
      : '0.00'

    return NextResponse.json({
      success: true,
      data: {
        date,
        statistics: {
          totalEmployees,
          presentToday,
          absentToday,
          totalLogsToday,
          avgHours,
          attendanceRate: totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : '0.0'
        },
        dailyAttendance: dailyAttendance || [],
        recentLogs: rawLogs || [],
        employees: employees || [],
        deviceStatus: deviceStatus || null
      }
    })

  } catch (error: any) {
    console.error('Attendance dashboard error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
