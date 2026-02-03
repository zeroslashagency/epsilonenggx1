export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'

/**
 * ⚡ PERFORMANCE: Aggregate dashboard endpoint
 * Combines multiple API calls into one:
 * - Attendance summary
 * - Employee count
 * - 7-day trends
 * - Recent activity
 * 
 * Reduces 4-7 round trips to 1
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()

    // IST timezone offset
    const istOffset = 5.5 * 60 * 60 * 1000
    const now = new Date()
    const istDate = new Date(now.getTime() + istOffset)
    const today = istDate.toISOString().split('T')[0]

    // ⚡ PARALLEL: Fetch all data at once
    const [
      employeesResult,
      todayLogsResult,
      weekLogsResult
    ] = await Promise.all([
      // 1. Get all employees
      supabase
        .from('employee_master')
        .select('employee_code, employee_name, department')
        .limit(10000),

      // 2. Get today's attendance
      supabase
        .from('employee_raw_logs')
        .select('employee_code, employee_name, punch_direction, log_date')
        .gte('log_date', `${today} 00:00:00`)
        .lte('log_date', `${today} 23:59:59`)
        .order('log_date', { ascending: false }),

      // 3. Get last 7 days for trends (single query instead of 7)
      supabase
        .from('employee_raw_logs')
        .select('employee_code, log_date')
        .gte('log_date', `${getDateString(istDate, -6)} 00:00:00`)
        .lte('log_date', `${today} 23:59:59`)
    ])

    const employees = employeesResult.data || []
    const todayLogs = todayLogsResult.data || []
    const weekLogs = weekLogsResult.data || []

    // Calculate summary
    const totalEmployees = employees.length
    const uniqueTodayEmployees = new Set(todayLogs.map(l => l.employee_code))
    const presentToday = uniqueTodayEmployees.size
    const attendancePercentage = totalEmployees > 0
      ? Math.round((presentToday / totalEmployees) * 100)
      : 0

    // Calculate 7-day trends from single query
    const trends = calculateTrends(weekLogs, totalEmployees, istDate)

    // Get recent activity (last 10 punches)
    const recentActivity = todayLogs.slice(0, 10).map(log => ({
      id: `${log.employee_code}-${log.log_date}`,
      employee_name: log.employee_name || `Employee ${log.employee_code}`,
      action: log.punch_direction === 'in' ? 'Punched In' : 'Punched Out',
      time: new Date(log.log_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: log.punch_direction?.toLowerCase() === 'in' ? 'in' : 'out'
    }))

    // Build employee status map
    const employeeStatus = new Map()
    todayLogs.forEach(log => {
      const code = log.employee_code
      if (!employeeStatus.has(code)) {
        employeeStatus.set(code, {
          employee_code: code,
          employee_name: log.employee_name || `Employee ${code}`,
          last_punch: log.log_date,
          status: log.punch_direction,
          punch_count: 1
        })
      } else {
        employeeStatus.get(code).punch_count++
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          presentToday,
          absentToday: totalEmployees - presentToday,
          attendancePercentage
        },
        trends,
        recentActivity,
        employeeStatus: Array.from(employeeStatus.values()),
        lastUpdated: new Date().toISOString()
      }
    }, {
      headers: {
        // ⚡ Allow 30s edge caching for dashboard
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, { status: 500 })
  }
}

function getDateString(date: Date, daysOffset: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

function calculateTrends(
  logs: any[],
  totalEmployees: number,
  baseDate: Date
): { date: string; present: number; absent: number; percentage: number }[] {
  const trends = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    // Count unique employees for this day
    const dayLogs = logs.filter(l => l.log_date.startsWith(dateStr))
    const present = new Set(dayLogs.map(l => l.employee_code)).size
    const percentage = totalEmployees > 0
      ? Math.round((present / totalEmployees) * 100)
      : 0

    trends.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present,
      absent: totalEmployees - present,
      percentage
    })
  }

  return trends
}
