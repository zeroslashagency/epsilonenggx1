export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics and KPIs
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'analytics.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const department = searchParams.get('department')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - parseInt(period))

    // Get overall attendance metrics
    const { data: attendanceData } = await supabase
      .from('analytics_shift_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Calculate overall KPIs
    const totalAssigned = attendanceData?.reduce((sum, day) => sum + (day.total_assigned || 0), 0) || 0
    const totalPresent = attendanceData?.reduce((sum, day) => sum + (day.total_present || 0), 0) || 0
    const totalLate = attendanceData?.reduce((sum, day) => sum + (day.total_late || 0), 0) || 0

    const overallAttendanceRate = totalAssigned > 0 ? (totalPresent / totalAssigned * 100) : 0
    const overallPunctualityRate = totalPresent > 0 ? ((totalPresent - totalLate) / totalPresent * 100) : 0

    // Get leave statistics
    const currentMonth = new Date()
    currentMonth.setDate(1) // First day of month

    let leaveQuery = supabase
      .from('analytics_leave_summary')
      .select('*, leave_type:leave_types(name, color)')
      .eq('month', currentMonth.toISOString().split('T')[0])

    if (department) {
      leaveQuery = leaveQuery.eq('department', department)
    }

    const { data: leaveData } = await leaveQuery

    const totalLeaveRequests = leaveData?.reduce((sum, item) => sum + (item.total_requests || 0), 0) || 0
    const approvedLeaveRequests = leaveData?.reduce((sum, item) => sum + (item.approved_requests || 0), 0) || 0
    const totalLeaveDays = leaveData?.reduce((sum, item) => sum + (item.total_days_approved || 0), 0) || 0

    // Get shift distribution
    const { data: shiftDistribution } = await supabase
      .from('analytics_shift_summary')
      .select(`
        shift_template_id,
        shift_templates(name, color),
        total_assigned,
        attendance_rate
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    // Aggregate shift data
    const shiftStats = shiftDistribution?.reduce((acc: any, item) => {
      const shiftId = item.shift_template_id
      if (!acc[shiftId]) {
        acc[shiftId] = {
          name: (item.shift_templates as any)?.name || 'Unknown',
          color: (item.shift_templates as any)?.color || '#3B82F6',
          total_assigned: 0,
          total_attendance_rate: 0,
          count: 0
        }
      }
      acc[shiftId].total_assigned += item.total_assigned || 0
      acc[shiftId].total_attendance_rate += item.attendance_rate || 0
      acc[shiftId].count += 1
      return acc
    }, {}) || {}

    // Calculate average attendance rates
    Object.keys(shiftStats).forEach(shiftId => {
      if (shiftStats[shiftId].count > 0) {
        shiftStats[shiftId].avg_attendance_rate = shiftStats[shiftId].total_attendance_rate / shiftStats[shiftId].count
      }
    })

    // Get trend data for charts
    const { data: trendData } = await supabase
      .from('analytics_shift_summary')
      .select('date, attendance_rate, punctuality_rate')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date')

    // Group trend data by date
    const dailyTrends = trendData?.reduce((acc: any, item) => {
      const date = item.date
      if (!acc[date]) {
        acc[date] = {
          date,
          attendance_rates: [],
          punctuality_rates: []
        }
      }
      acc[date].attendance_rates.push(item.attendance_rate || 0)
      acc[date].punctuality_rates.push(item.punctuality_rate || 0)
      return acc
    }, {}) || {}

    // Calculate daily averages
    const chartData = Object.values(dailyTrends).map((day: any) => ({
      date: day.date,
      attendance_rate: day.attendance_rates.reduce((sum: number, rate: number) => sum + rate, 0) / day.attendance_rates.length,
      punctuality_rate: day.punctuality_rates.reduce((sum: number, rate: number) => sum + rate, 0) / day.punctuality_rates.length
    }))

    // Get top performers (employees with best metrics)
    const { data: topPerformers } = await supabase
      .from('analytics_employee_metrics')
      .select('employee_code, attendance_rate, punctuality_rate')
      .eq('month', currentMonth.toISOString().split('T')[0])
      .order('attendance_rate', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          overall_attendance_rate: Math.round(overallAttendanceRate * 100) / 100,
          overall_punctuality_rate: Math.round(overallPunctualityRate * 100) / 100,
          total_leave_requests: totalLeaveRequests,
          approved_leave_requests: approvedLeaveRequests,
          total_leave_days: totalLeaveDays,
          leave_approval_rate: totalLeaveRequests > 0 ? Math.round((approvedLeaveRequests / totalLeaveRequests * 100) * 100) / 100 : 0
        },
        shift_distribution: Object.values(shiftStats),
        leave_breakdown: leaveData || [],
        trend_data: chartData,
        top_performers: topPerformers || [],
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          days: parseInt(period)
        }
      }
    })

  } catch (error: any) {
    console.error('Error in analytics dashboard API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
