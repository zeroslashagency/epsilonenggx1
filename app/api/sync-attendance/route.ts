export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

// SmartOffice API Configuration
const SMART_OFFICE_CONFIG = {
  baseUrl: 'http://localhost:84/api/v2/WebAPI',
  apiKey: '344612092518'
}

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require attendance.sync permission
  const authResult = await requirePermission(request, 'attendance.sync')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // For cloud sync approach, we only sync recent data (last 24 hours)
    // The office PC script handles historical data sync
    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toDate = new Date().toISOString().split('T')[0]
    
    // Fetch logs from SmartOffice API
    const smartOfficeUrl = `${SMART_OFFICE_CONFIG.baseUrl}/GetDeviceLogs?APIKey=${SMART_OFFICE_CONFIG.apiKey}&FromDate=${fromDate}&ToDate=${toDate}`
    
    
    let response
    try {
      response = await fetch(smartOfficeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
    } catch (fetchError) {
      // Return success with 0 new logs when SmartOffice is not available
      return NextResponse.json({
        success: true,
        message: 'SmartOffice API not available - using existing data',
        totalFetched: 0,
        newLogs: 0,
        syncTimestamp: new Date().toISOString(),
        warning: 'SmartOffice device not connected - Office sync script should be running',
        recommendation: 'Set up the office-sync-script.js on your office computer for automatic syncing'
      })
    }
    
    if (!response.ok) {
      // Return success with 0 new logs when API returns error
      return NextResponse.json({
        success: true,
        message: `SmartOffice API error: ${response.status}`,
        totalFetched: 0,
        newLogs: 0,
        syncTimestamp: new Date().toISOString(),
        warning: 'SmartOffice API returned error',
        recommendation: 'Check if SmartOffice is running on office computer'
      })
    }
    
    const logs = await response.json()
    
    if (!Array.isArray(logs)) {
      throw new Error('Invalid response format from SmartOffice API')
    }
    
    
    // Transform logs for Supabase storage
    const transformedLogs = logs.map((log: any) => ({
      employee_code: String(log.EmployeeCode || 'Unknown'),
      employee_name: log.EmployeeName || 'Unknown Employee',
      log_date: new Date(log.LogDate).toISOString(),
      punch_direction: (log.PunchDirection || 'unknown').toLowerCase(),
      serial_number: log.SerialNumber || 'Unknown',
      temperature: log.Temperature || null,
      temperature_state: log.TemperatureState || 'Unknown',
      device_location: 'Main Office', // Default location
      sync_timestamp: new Date().toISOString()
    }))
    
    // Check for duplicates and insert new logs
    let newLogsCount = 0
    if (transformedLogs.length > 0) {
      // Get existing logs to avoid duplicates
      const { data: existingLogs } = await supabase
        .from('employee_attendance_logs')
        .select('log_date, employee_code, punch_direction')
      
      // Filter out duplicates based on exact match
      const newLogs = transformedLogs.filter(newLog => 
        !existingLogs?.some(existing => 
          existing.log_date === newLog.log_date &&
          existing.employee_code === newLog.employee_code &&
          existing.punch_direction === newLog.punch_direction
        )
      )
      
      if (newLogs.length > 0) {
        const { error } = await supabase
          .from('employee_attendance_logs')
          .insert(newLogs)
        
        if (error) {
          throw new Error(`Supabase insert error: ${error.message}`)
        }
        
        newLogsCount = newLogs.length
      } else {
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${newLogsCount} new attendance logs`,
      totalFetched: logs.length,
      newLogs: newLogsCount,
      syncTimestamp: new Date().toISOString(),
      syncMethod: 'Direct API call',
      note: 'For automatic syncing, use the office-sync-script.js on your office computer'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      syncTimestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require attendance.sync permission
  const authResult = await requirePermission(request, 'attendance.sync')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    // Manual sync trigger
    const result = await GET(request)
    return result
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Manual sync failed'
    }, { status: 500 })
  }
}
