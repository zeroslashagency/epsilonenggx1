export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ SECURITY FIX: Check if user has dashboard OR attendance permission
  const supabase = getSupabaseAdminClient()
  
  // Get user
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult
  
  // Super Admin bypass
  if (user.role === 'Super Admin' || user.role === 'super_admin') {
    // Continue to data fetching
  } else {
    // Check if user has dashboard.Dashboard.view OR attendance.Attendance.view
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions_json')
      .eq('name', user.role)
      .single()
    
    const permissions = roleData?.permissions_json
    const hasDashboardPermission = permissions?.main_dashboard?.items?.Dashboard?.view === true
    const hasAttendancePermission = permissions?.main_attendance?.items?.Attendance?.view === true
    
    if (!hasDashboardPermission && !hasAttendancePermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied. Required: dashboard.Dashboard.view OR attendance.Attendance.view' },
        { status: 403 }
      )
    }
  }

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all employee master data
    const { data: employeeMaster, error } = await supabase
      .from('employee_master')
      .select('*')
      .order('employee_code', { ascending: true })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch employee master data'
      }, { status: 500 })
    }
    
    // Get unique employee codes from attendance logs
    const { data: attendanceLogs, error: attendanceError } = await supabase
      .from('employee_attendance_logs')
      .select('employee_code, employee_name, sync_timestamp')
      .order('sync_timestamp', { ascending: false })
      .limit(100)
    
    if (attendanceError) {
    }
    
    // Get unique employee codes
    const uniqueEmployeeCodes = attendanceLogs ? 
      [...new Set(attendanceLogs.map(log => log.employee_code))] : []
    
    // ⚡ PERFORMANCE: Employee data is mostly static, cache for 2 minutes
    return NextResponse.json({
      success: true,
      employeeMaster: employeeMaster || [],
      totalEmployeeMasterRecords: employeeMaster?.length || 0,
      uniqueEmployeeCodesFromAttendance: uniqueEmployeeCodes,
      attendanceLogsSample: attendanceLogs?.slice(0, 10) || [],
      lastSyncTime: attendanceLogs?.[0]?.sync_timestamp || 'No data',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}




