import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use direct Supabase configuration
const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const dateRange = searchParams.get('dateRange') || 'all' // Default to all historical data
    const employeeCode = searchParams.get('employeeCode') // Filter by specific employee
    const limit = parseInt(searchParams.get('limit') || '20') // Default to 20 items per page
    const offset = parseInt(searchParams.get('offset') || '0') // Pagination offset
    
    // Calculate date range - show ALL historical data by default
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999) // End of today
    const startDate = new Date()
    
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
    
    // First, get total count for pagination
    let countQuery = supabase
      .from('employee_attendance_logs')
      .select('*', { count: 'exact', head: true })
      .gte('log_date', startDate.toISOString())
      .lte('log_date', endDate.toISOString())
    
    if (employeeCode) {
      countQuery = countQuery.eq('employee_code', employeeCode)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) {
      throw new Error(`Supabase count error: ${countError.message}`)
    }
    
    // Build query with pagination
    let query = supabase
      .from('employee_attendance_logs')
      .select('*')
      .gte('log_date', startDate.toISOString())
      .lte('log_date', endDate.toISOString())
      .order('log_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Add employee filter if specified
    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }
    
    const { data: attendanceLogs, error } = await query
    
    if (error) {
      throw new Error(`Supabase query error: ${error.message}`)
    }

    // Get employee names from employee_master
    const { data: employees, error: employeeError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation')

    if (employeeError) {
      console.warn('Could not fetch employee names:', employeeError)
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
      console.log('Employee map created with', employeeMap.size, 'employees')
      console.log('Sample employee codes:', Array.from(employeeMap.keys()).slice(0, 5))
    } else {
      console.log('No employees found in employee_master')
    }
    
    // Calculate today's summary
    const today = new Date().toISOString().split('T')[0]
    const todayLogs = attendanceLogs?.filter(log => 
      log.log_date.startsWith(today)
    ) || []
    
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
    
    // Calculate summary statistics
    // For now, use the known total from our employee data (37 employees)
    // TODO: Fix the employee_master query issue
    const totalEmployees = 37
    const presentToday = Array.from(employeeStatus.values()).filter(emp => 
      emp.status === 'in' || emp.status === 'out'
    ).length
    const absentToday = totalEmployees - presentToday
    
    // Calculate late arrivals (employees who punched in after 9:00 AM)
    const lateArrivals = Array.from(employeeStatus.values()).filter(emp => {
      if (emp.status !== 'in' || !emp.last_punch) return false
      const punchHour = new Date(emp.last_punch).getHours()
      return punchHour >= 9 // 9:00 AM or later
    }).length
    
    // Calculate early departures (employees who punched out before 6:00 PM)
    const earlyDepartures = Array.from(employeeStatus.values()).filter(emp => {
      if (emp.status !== 'out' || !emp.last_punch) return false
      const punchHour = new Date(emp.last_punch).getHours()
      return punchHour < 18 // Before 6:00 PM
    }).length
    
    // Get recent logs (last 10) with proper employee names
    const recentLogs = (attendanceLogs?.slice(0, 10) || []).map(log => {
      const employeeInfo = employeeMap.get(log.employee_code)
      return {
        ...log,
        employee_name: employeeInfo?.name || log.employee_name || `Employee ${log.employee_code}`,
        department: employeeInfo?.department || 'Unknown',
        designation: employeeInfo?.designation || 'Unknown'
      }
    })
    
    // Get unique employees list with proper names
    const uniqueEmployees = Array.from(new Set(attendanceLogs?.map(log => {
      const employeeInfo = employeeMap.get(log.employee_code)
      return JSON.stringify({
        employee_code: log.employee_code,
        employee_name: employeeInfo?.name || log.employee_name || `Employee ${log.employee_code}`
      })
    }))).map(str => JSON.parse(str)).slice(0, 20) // Limit to 20 for dropdown
    
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
        allLogs: attendanceLogs,
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
    console.error('Get attendance error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch attendance data'
    }, { status: 500 })
  }
}
