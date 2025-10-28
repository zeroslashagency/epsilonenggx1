export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require schedule.view permission
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all employee master data
    const { data: employeeMaster, error } = await supabase
      .from('employee_master')
      .select('*')
      .order('employee_code', { ascending: true })
    
    if (error) {
      console.error('Error fetching employee master:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch employee master data'
      }, { status: 500 })
    }
    
    // Get unique employee codes from attendance logs
    const { data: attendanceLogs, error: attendanceError } = await supabase
      .from('employee_attendance_logs')
      .select('employee_code, employee_name')
      .order('sync_timestamp', { ascending: false })
      .limit(100)
    
    if (attendanceError) {
      console.error('Error fetching attendance logs:', attendanceError)
    }
    
    // Get unique employee codes
    const uniqueEmployeeCodes = attendanceLogs ? 
      [...new Set(attendanceLogs.map(log => log.employee_code))] : []
    
    return NextResponse.json({
      success: true,
      employeeMaster: employeeMaster || [],
      totalEmployeeMasterRecords: employeeMaster?.length || 0,
      uniqueEmployeeCodesFromAttendance: uniqueEmployeeCodes,
      attendanceLogsSample: attendanceLogs?.slice(0, 10) || [],
      lastSyncTime: attendanceLogs?.[0]?.sync_timestamp || 'No data',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Employee master API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}




