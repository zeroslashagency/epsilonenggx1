export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/analytics/employee-metrics
 * Get employee performance metrics
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'analytics.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employee_code')
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) + '-01'
    const department = searchParams.get('department')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('analytics_employee_metrics')
      .select('*')
      .eq('month', month)
      .order('attendance_rate', { ascending: false })
      .limit(limit)

    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }

    const { data: metrics, error } = await query

    if (error) {
      console.error('Error fetching employee metrics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch employee metrics' },
        { status: 500 }
      )
    }

    // Get employee details for the metrics
    if (metrics && metrics.length > 0) {
      const employeeCodes = metrics.map(m => m.employee_code)
      const { data: employees } = await supabase
        .from('employee_master')
        .select('employee_code, employee_name, department')
        .in('employee_code', employeeCodes)

      // Merge employee details with metrics
      const enrichedMetrics = metrics.map(metric => {
        const employee = employees?.find(emp => emp.employee_code === metric.employee_code)
        return {
          ...metric,
          employee_name: employee?.employee_name || 'Unknown',
          department: employee?.department || 'Unknown'
        }
      })

      // Filter by department if specified
      const filteredMetrics = department 
        ? enrichedMetrics.filter(m => m.department === department)
        : enrichedMetrics

      return NextResponse.json({
        success: true,
        data: filteredMetrics,
        count: filteredMetrics.length,
        month: month
      })
    }

    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      month: month
    })

  } catch (error: any) {
    console.error('Error in employee metrics API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/analytics/employee-metrics
 * Refresh employee metrics for a specific month
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'analytics.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { month, employeeCode } = body

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'Month is required' },
        { status: 400 }
      )
    }

    const targetMonth = new Date(month + '-01')
    const nextMonth = new Date(targetMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    // Build employee filter
    let employeeFilter = ''
    if (employeeCode) {
      employeeFilter = `AND esa.employee_code = '${employeeCode}'`
    }

    // Calculate metrics using raw SQL for better performance
    const { data: calculatedMetrics, error } = await supabase.rpc('calculate_employee_metrics', {
      target_month: month + '-01',
      employee_code_filter: employeeCode
    })

    if (error) {
      console.error('Error calculating metrics:', error)
      // Fallback to manual calculation
      const { data: employees } = await supabase
        .from('employee_master')
        .select('employee_code')
        .eq('status', 'active')

      if (!employees) {
        return NextResponse.json(
          { success: false, error: 'No employees found' },
          { status: 404 }
        )
      }

      const metricsToInsert = []

      for (const employee of employees) {
        if (employeeCode && employee.employee_code !== employeeCode) continue

        // Get shift assignments for the month
        const { data: assignments } = await supabase
          .from('employee_shift_assignments')
          .select('*')
          .eq('employee_code', employee.employee_code)
          .lte('start_date', nextMonth.toISOString().split('T')[0])
          .or(`end_date.is.null,end_date.gte.${targetMonth.toISOString().split('T')[0]}`)

        // Get attendance data for the month
        const { data: attendance } = await supabase
          .from('employee_raw_logs')
          .select('log_date, punch_state, log_time')
          .eq('employee_code', employee.employee_code)
          .gte('log_date', targetMonth.toISOString().split('T')[0])
          .lt('log_date', nextMonth.toISOString().split('T')[0])

        // Get leave data for the month
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('total_days')
          .eq('employee_code', employee.employee_code)
          .eq('status', 'approved')
          .gte('start_date', targetMonth.toISOString().split('T')[0])
          .lt('start_date', nextMonth.toISOString().split('T')[0])

        // Calculate metrics
        const totalShifts = assignments?.length || 0
        const attendanceDays = new Set(attendance?.map(a => a.log_date)).size
        const lateCount = 0 // Would need shift timing comparison
        const leaveDaysTaken = leaves?.reduce((sum, leave) => sum + leave.total_days, 0) || 0

        metricsToInsert.push({
          employee_code: employee.employee_code,
          month: month + '-01',
          total_shifts: totalShifts,
          attended_shifts: attendanceDays,
          late_count: lateCount,
          leave_days_taken: leaveDaysTaken,
          overtime_hours: 0
        })
      }

      // Upsert metrics
      if (metricsToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('analytics_employee_metrics')
          .upsert(metricsToInsert, {
            onConflict: 'employee_code,month'
          })

        if (upsertError) {
          console.error('Error upserting metrics:', upsertError)
          return NextResponse.json(
            { success: false, error: 'Failed to update metrics' },
            { status: 500 }
          )
        }
      }
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'employee_metrics_refreshed',
      meta_json: {
        month: month,
        employee_code: employeeCode,
        metrics_count: calculatedMetrics?.length || 0
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee metrics refreshed successfully',
      data: {
        month: month,
        employee_code: employeeCode,
        metrics_updated: calculatedMetrics?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Error in refresh employee metrics API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
