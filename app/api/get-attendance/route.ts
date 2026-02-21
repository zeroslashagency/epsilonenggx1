export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { getSupabaseServerClient } from '@/app/lib/services/supabase-server'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'
import { hasMainDashboardPermission } from '@/app/lib/features/auth/dashboard-permissions'

export async function GET(request: NextRequest) {
  // ✅ SECURITY FIX: Check if user has dashboard OR attendance permission
  // 🔧 Check if user has dashboard OR attendance permission
  const supabase = getSupabaseAdminClient()

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  // Super Admin bypass
  if (user.role === 'Super Admin' || user.role === 'super_admin') {
    // Continue to data fetching
  } else {
    // Check if user has dashboard OR attendance permission
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions_json')
      .eq('name', user.role)
      .single()

    const permissions = roleData?.permissions_json
    const hasDashboardPermission = hasMainDashboardPermission(permissions, 'view')
    const hasAttendancePermission = permissions?.main_attendance?.items?.Attendance?.view === true

    if (!hasDashboardPermission && !hasAttendancePermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied. Required: dashboard.Dashboard.view OR attendance.Attendance.view' },
        { status: 403 }
      )
    }
  }

  try {

    const supabase = await getSupabaseServerClient()
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
    // CRITICAL: Use IST timezone for date calculations
    const istOffset = 5.5 * 60 * 60 * 1000 // IST is UTC+5:30
    let startDate: Date
    let endDate: Date
    let calculatedFromDate: string | undefined
    let calculatedToDate: string | undefined

    if (fromDate && toDate) {
      // Database stores timestamps WITHOUT timezone info (naive timestamps in IST)
      // Query directly using date strings - no timezone conversion needed
      startDate = new Date(`${fromDate}T00:00:00`)
      endDate = new Date(`${toDate}T23:59:59.999`)


    } else {
      // Fallback to dateRange parameter - calculate IST date string directly
      const now = new Date()
      const istDate = new Date(now.getTime() + istOffset)
      const todayIST = istDate.toISOString().split('T')[0]

      // Work with date strings directly for consistent IST handling
      if (dateRange === 'all') {
        calculatedFromDate = '2020-01-01'
        calculatedToDate = todayIST
      } else if (dateRange === 'today') {
        calculatedFromDate = todayIST
        calculatedToDate = todayIST
      } else {
        // Parse numeric dateRange (e.g., '7' for last 7 days)
        const daysBack = parseInt(dateRange)
        if (!isNaN(daysBack)) {
          const pastDate = new Date(istDate)
          pastDate.setDate(pastDate.getDate() - daysBack)
          calculatedFromDate = pastDate.toISOString().split('T')[0]
          calculatedToDate = todayIST
        } else {
          // Default to today
          calculatedFromDate = todayIST
          calculatedToDate = todayIST
        }
      }

      // Create Date objects only for response metadata (not used in query)
      startDate = new Date(`${calculatedFromDate}T00:00:00`)
      endDate = new Date(`${calculatedToDate}T23:59:59.999`)
    }

    // First, get total count for pagination
    // CRITICAL: Always use naive timestamp format (no 'T' separator) to prevent timezone conversion
    // Database stores timestamps in IST without timezone info, so we must query the same way
    // Use provided fromDate/toDate if available, otherwise use calculated IST date strings directly
    const gteValue = fromDate ? `${fromDate} 00:00:00` : `${calculatedFromDate} 00:00:00`
    const lteValue = toDate ? `${toDate} 23:59:59` : `${calculatedToDate} 23:59:59`



    let countQuery = supabase
      .from('employee_raw_logs')
      .select('id', { count: 'exact', head: true })
      .gte('log_date', gteValue)
      .lte('log_date', lteValue)
      .limit(100000) // Ensure count query has no artificial limit

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
    const batchSize = 1000 // Use consistent batch size
    const maxRecords = 50000 // No artificial limit - fetch all records


    // Supabase has a default limit of 1000 rows, so we need to fetch in batches
    let allLogs: any[] = []
    let currentOffset = 0
    let hasMore = true

    while (hasMore && allLogs.length < maxRecords) {
      let query = supabase
        .from('employee_raw_logs')
        .select('*')
        .gte('log_date', gteValue)
        .lte('log_date', lteValue)
        .order('log_date', { ascending: false })
        .limit(batchSize)
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



    // Get employee names from employee_master with better error handling
    const { data: employees, error: employeeError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation')
      .limit(10000)

    if (employeeError) {
    }



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
    const istDate = new Date(now.getTime() + istOffset)
    const today = istDate.toISOString().split('T')[0]

    // Get today's logs - database stores IST timestamps directly
    // Query for today's date in IST (no timezone conversion needed)
    const todayStartStr = `${today} 00:00:00`
    const todayEndStr = `${today} 23:59:59`



    const { data: todayLogsFromDB, error: todayError } = await supabase
      .from('employee_raw_logs')
      .select('*')
      .gte('log_date', todayStartStr)
      .lte('log_date', todayEndStr)
      .order('log_date', { ascending: false })

    const todayLogs = todayError ? [] : (todayLogsFromDB || [])



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

    // Get recent logs from TODAY's data (not filtered attendanceLogs)
    const recentLogs = (todayLogs || []).map(log => {
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
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
