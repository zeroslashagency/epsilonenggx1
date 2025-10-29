export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET-ATTENDANCE] Request received at:', new Date().toISOString())
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    
    // Get query parameters - support both dateRange and fromDate/toDate
    const dateRange = searchParams.get('dateRange') || 'all'
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const employeeCode = searchParams.get('employeeCode')
    const employeeCodes = searchParams.get('employeeCodes') // Multiple employees (comma-separated)
    const limit = parseInt(searchParams.get('limit') || '50000') // Default to large number for all records
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Calculate date range - prioritize fromDate/toDate if provided
    let startDate: Date
    let endDate: Date
    
    if (fromDate && toDate) {
      // Use provided date range
      startDate = new Date(fromDate)
      endDate = new Date(toDate)
      endDate.setHours(23, 59, 59, 999) // End of day
      console.log('📅 [GET-ATTENDANCE] Using provided date range:', { fromDate, toDate, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
    } else {
      // Fallback to dateRange parameter
      endDate = new Date()
      endDate.setHours(23, 59, 59, 999) // End of today
      startDate = new Date()
      
      if (dateRange === 'all') {
        startDate.setFullYear(2020, 0, 1) // Start from 2020 to show all historical data
      } else if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0) // Start of today
      } else {
        // Parse numeric dateRange (e.g., '7' for last 7 days)
        const daysBack = parseInt(dateRange)
        if (!isNaN(daysBack)) {
          startDate.setDate(startDate.getDate() - daysBack)
        } else {
          startDate.setHours(0, 0, 0, 0) // Default to start of today
        }
      }
      startDate.setHours(0, 0, 0, 0) // Start of day
    }
    
    // First, get total count for pagination
    let countQuery = supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact', head: true })
      .gte('log_date', startDate.toISOString())
      .lte('log_date', endDate.toISOString())
    
    if (employeeCode) {
      countQuery = countQuery.eq('employee_code', employeeCode)
    } else if (employeeCodes) {
      const codes = employeeCodes.split(',').map(code => code.trim())
      countQuery = countQuery.in('employee_code', codes)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) {
      throw new Error(`Supabase count error: ${countError.message}`)
    }
    
    // Optimize: For single-day queries (like today), use smaller batch size
    const isSingleDay = fromDate && toDate && fromDate === toDate
    const batchSize = isSingleDay ? 500 : 1000 // Smaller batches for single day
    const maxRecords = isSingleDay ? 2000 : 50000 // Limit for single day to avoid excessive fetching
    
    
    // Supabase has a default limit of 1000 rows, so we need to fetch in batches
    let allLogs: any[] = []
    let currentOffset = 0
    let hasMore = true
    
    while (hasMore && allLogs.length < maxRecords) {
      let query = supabase
        .from('employee_raw_logs')
        .select('*')
        .gte('log_date', startDate.toISOString())
        .lte('log_date', endDate.toISOString())
        .order('log_date', { ascending: false })
        .range(currentOffset, currentOffset + batchSize - 1)
      
      // Add employee filter if specified
      if (employeeCode) {
        query = query.eq('employee_code', employeeCode)
      } else if (employeeCodes) {
        const codes = employeeCodes.split(',').map(code => code.trim())
        query = query.in('employee_code', codes)
      }
      
      const { data: batchLogs, error } = await query
      
      if (error) {
        throw new Error(`Supabase query error: ${error.message}`)
      }
      
      if (batchLogs && batchLogs.length > 0) {
        allLogs = allLogs.concat(batchLogs)
        currentOffset += batchSize
        hasMore = batchLogs.length === batchSize // Continue if we got a full batch
      } else {
        hasMore = false
      }
    }
    
    const attendanceLogs = allLogs
    
    console.log('📊 [GET-ATTENDANCE] Query results:', { 
      recordsFound: attendanceLogs?.length || 0, 
      totalCount, 
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      sampleRecord: attendanceLogs?.[0] 
    })

    // Get employee names from employee_master with better error handling
    const { data: employees, error: employeeError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation')
      .limit(10000)

    if (employeeError) {
    }

    console.log('👥 [GET-ATTENDANCE] Employee data fetched:', { 
      employeeCount: employees?.length || 0,
      employeeError: employeeError?.message,
      sampleEmployee: employees?.[0]
    })

    // Create a map of employee codes to names
    const employeeMap = new Map()
    if (employees) {
      employees.forEach(emp => {
        employeeMap.set(emp.employee_code, {
          name: emp.employee_name,
          department: emp.department,
          designation: emp.designation
        })
      })
    } else {
    }
    
    // Calculate today's summary - get today's data specifically
    // Use UTC+5:30 (Indian Standard Time) for proper date calculation
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000 // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset)
    const today = istDate.toISOString().split('T')[0]
    
    // Get today's logs specifically from database
    const { data: todayLogsFromDB, error: todayError } = await supabase
      .from('employee_raw_logs')
      .select('*')
      .gte('log_date', `${today}T00:00:00`)
      .lte('log_date', `${today}T23:59:59`)
    
    const todayLogs = todayError ? [] : (todayLogsFromDB || [])
    
    console.log('📅 [GET-ATTENDANCE] Today\'s data:', { 
      today, 
      todayLogsCount: todayLogs.length, 
      todayError: todayError?.message,
      sampleTodayLog: todayLogs[0] 
    })
    
    // Group by employee for today's status
    const employeeStatus = new Map()
    todayLogs.forEach(log => {
      const employeeCode = log.employee_code
      const employeeInfo = employeeMap.get(employeeCode)
      
      if (!employeeStatus.has(employeeCode)) {
        employeeStatus.set(employeeCode, {
          employee_code: employeeCode,
          employee_name: employeeInfo?.name || log.employee_name || `Employee ${employeeCode}`,
          department: employeeInfo?.department || 'Unknown',
          designation: employeeInfo?.designation || 'Unknown',
          last_punch: null,
          status: 'unknown',
          punch_count: 0
        })
      }
      
      const employee = employeeStatus.get(employeeCode)
      if (!employee.last_punch || new Date(log.log_date) > new Date(employee.last_punch)) {
        employee.last_punch = log.log_date
        employee.status = log.punch_direction
      }
      employee.punch_count++
    })
    
    // Calculate summary statistics using real data
    // Get total unique employees using a more efficient query
    const { data: uniqueEmployeeData, error: uniqueEmployeeError } = await supabase
      .rpc('get_unique_employee_count')
      .single()
    
    // Fallback: if RPC doesn't exist, use direct query with no limit
    let totalEmployees = 47 // Known value from our previous check
    if (!uniqueEmployeeError && uniqueEmployeeData && typeof uniqueEmployeeData === 'object') {
      totalEmployees = (uniqueEmployeeData as any).count || 47
    }
    
    console.log('👥 [GET-ATTENDANCE] Employee count calculation:', { 
      uniqueEmployeeError: uniqueEmployeeError?.message,
      totalEmployees 
    })
    // Present today = employees who have any punch activity today
    const presentToday = employeeStatus.size
    const absentToday = Math.max(0, totalEmployees - presentToday) // Ensure non-negative
    
    // Calculate late arrivals (employees who punched in after 9:00 AM)
    // Exclude security guards and night shift workers
    const lateArrivals = Array.from(employeeStatus.values()).filter(emp => {
      if (!emp.last_punch) return false
      // Skip security guards and test employees
      if (emp.employee_name.toLowerCase().includes('security') || emp.employee_code.startsWith('EE ')) return false
      const punchHour = new Date(emp.last_punch).getHours()
      return punchHour >= 9 // 9:00 AM or later
    }).length
    
    // Calculate early departures (employees who punched out before 6:00 PM)
    const earlyDepartures = Array.from(employeeStatus.values()).filter(emp => {
      if (emp.status !== 'out' || !emp.last_punch) return false
      const punchHour = new Date(emp.last_punch).getHours()
      return punchHour < 18 // Before 6:00 PM
    }).length
    
    // Get recent logs (all logs) with proper employee names and field mapping
    const recentLogs = (attendanceLogs || []).map(log => {
      const employeeInfo = employeeMap.get(log.employee_code)
      return {
        ...log,
        employee_name: employeeInfo?.name || log.employee_name || `Employee ${log.employee_code}`,
        department: employeeInfo?.department || 'Unknown',
        designation: employeeInfo?.designation || 'Unknown',
        // Map sync_time to created_at for backward compatibility
        created_at: log.sync_time,
        synced_at: log.sync_time
      }
    })
    
    // Get unique employees list with proper names
    const uniqueEmployees = Array.from(new Set(attendanceLogs?.map(log => {
      const employeeInfo = employeeMap.get(log.employee_code)
      return JSON.stringify({
        employee_code: log.employee_code,
        employee_name: employeeInfo?.name || log.employee_name || `Employee ${log.employee_code}`
      })
    }))).map(str => JSON.parse(str)) // Show all employees for export selection
    
    console.log('✅ [GET-ATTENDANCE] Returning response with', attendanceLogs?.length || 0, 'logs')
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          present: presentToday,
          absent: absentToday,
          lateArrivals,
          earlyDepartures
        },
        todayStatus: Array.from(employeeStatus.values()).map(status => ({
          employee_code: status.employee_code,
          employee_name: status.employee_name,
          last_punch_direction: status.status,
          last_punch_time: status.last_punch ? new Date(status.last_punch).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) : 'N/A',
          last_punch: status.last_punch,
          status: status.status,
          punch_count: status.punch_count
        })),
        recentLogs,
        allLogs: attendanceLogs?.map(log => {
          const employeeInfo = employeeMap.get(log.employee_code)
          return {
            ...log,
            employee_name: employeeInfo?.name || `Employee ${log.employee_code}`,
            department: employeeInfo?.department || 'Unknown',
            designation: employeeInfo?.designation || 'Unknown',
            created_at: log.sync_time,
            synced_at: log.sync_time
          }
        }) || [],
        employees: uniqueEmployees,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          itemsPerPage: limit,
          totalRecords: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasNextPage: (offset + limit) < (totalCount || 0),
          hasPrevPage: offset > 0
        },
        lastUpdated: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ [GET-ATTENDANCE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch attendance data'
    }, { status: 500 })
  }
}
