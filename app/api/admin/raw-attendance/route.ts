export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth, requireGranularPermission } from '@/app/lib/middleware/auth.middleware'

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
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    
    const employeeCode = searchParams.get('employeeCode')
    const date = searchParams.get('date')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('employee_raw_logs')
      .select('*')
      .order('log_date', { ascending: false })

    // Filter by employee code
    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }

    // Filter by specific date
    if (date) {
      query = query
        .gte('log_date', `${date} 00:00:00`)
        .lt('log_date', `${date} 23:59:59`)
    }

    // Filter by date range
    if (fromDate && toDate) {
      query = query
        .gte('log_date', `${fromDate} 00:00:00`)
        .lte('log_date', `${toDate} 23:59:59`)
    }

    // Apply limit
    query = query.limit(limit)

    const { data: rawLogs, error: logsError } = await query

    if (logsError) throw logsError

    // Get employee names
    const { data: employees, error: empError } = await supabase
      .from('employee_master')
      .select('*')
      .order('employee_code')

    if (empError) {
      // Continue without employee names if table doesn't exist
    }

    // Get statistics
    let statsQuery = supabase
      .from('employee_raw_logs')
      .select('employee_code, punch_direction, log_date')

    if (date) {
      statsQuery = statsQuery
        .gte('log_date', `${date} 00:00:00`)
        .lt('log_date', `${date} 23:59:59`)
    }

    const { data: allLogs, error: statsError } = await statsQuery

    if (statsError) throw statsError

    // Calculate basic statistics
    const totalLogs = allLogs?.length || 0
    const uniqueEmployees = new Set(allLogs?.map(log => log.employee_code)).size
    const inPunches = allLogs?.filter(log => log.punch_direction === 'in').length || 0
    const outPunches = allLogs?.filter(log => log.punch_direction === 'out').length || 0

    // Detect potential issues (multiple INs without OUT)
    const employeeIssues: Record<string, { ins: number, outs: number, lastPunch: string | null }> = {}
    if (allLogs) {
      for (const log of allLogs) {
        if (!employeeIssues[log.employee_code]) {
          employeeIssues[log.employee_code] = { ins: 0, outs: 0, lastPunch: null }
        }
        employeeIssues[log.employee_code][log.punch_direction === 'in' ? 'ins' : 'outs']++
        employeeIssues[log.employee_code].lastPunch = log.punch_direction
      }
    }

    const issuesDetected = Object.entries(employeeIssues).filter(([code, data]: [string, any]) => 
      data.ins > data.outs + 1 || data.outs > data.ins
    ).length

    return NextResponse.json({
      success: true,
      data: {
        rawLogs: rawLogs || [],
        employees: employees || [],
        statistics: {
          totalLogs,
          uniqueEmployees,
          inPunches,
          outPunches,
          issuesDetected,
          date: date || 'all dates'
        },
        employeeIssues
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // ✅ SECURITY FIX: Require granular permission
  const authResult = await requireGranularPermission(request, 'main_attendance', 'Attendance', 'edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    const { action, employeeCode, date, calculationMethod } = await request.json()

    if (action === 'calculate') {
      // Get raw logs for specific employee and date
      const { data: logs, error } = await supabase
        .from('employee_raw_logs')
        .select('*')
        .eq('employee_code', employeeCode)
        .gte('log_date', `${date} 00:00:00`)
        .lt('log_date', `${date} 23:59:59`)
        .order('log_date', { ascending: true })

      if (error) throw error

      if (!logs || logs.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            employeeCode,
            date,
            totalHours: 0,
            status: 'absent',
            punches: [],
            issues: ['No punches recorded']
          }
        })
      }

      // Separate IN and OUT punches
      const inPunches = logs.filter((log: any) => log.punch_direction === 'in')
      const outPunches = logs.filter((log: any) => log.punch_direction === 'out')

      let calculatedHours = 0
      let status = 'present'
      let issues: string[] = []

      // Apply calculation method (your logic)
      switch (calculationMethod) {
        case 'first_in_last_out':
          if (inPunches.length > 0 && outPunches.length > 0) {
            const firstIn = new Date(inPunches[0].log_date)
            const lastOut = new Date(outPunches[outPunches.length - 1].log_date)
            calculatedHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60)
          } else if (inPunches.length > 0 && outPunches.length === 0) {
            status = 'incomplete'
            issues.push('No OUT punch recorded')
          }
          break

        case 'last_in_last_out':
          if (inPunches.length > 0 && outPunches.length > 0) {
            const lastIn = new Date(inPunches[inPunches.length - 1].log_date)
            const lastOut = new Date(outPunches[outPunches.length - 1].log_date)
            if (lastOut > lastIn) {
              calculatedHours = (lastOut.getTime() - lastIn.getTime()) / (1000 * 60 * 60)
            } else {
              issues.push('Last OUT is before last IN')
            }
          }
          break

        case 'strict_pairs':
          // Pair each IN with next OUT
          let totalMinutes = 0
          for (let i = 0; i < inPunches.length; i++) {
            const inTime = new Date(inPunches[i].log_date)
            const nextOut = outPunches.find((out: any) => new Date(out.log_date) > inTime)
            if (nextOut) {
              const outTime = new Date(nextOut.log_date)
              totalMinutes += (outTime.getTime() - inTime.getTime()) / (1000 * 60)
            } else {
              issues.push(`IN punch at ${inPunches[i].log_date} has no matching OUT`)
            }
          }
          calculatedHours = totalMinutes / 60
          break

        default:
          // Default: first IN, last OUT
          if (inPunches.length > 0 && outPunches.length > 0) {
            const firstIn = new Date(inPunches[0].log_date)
            const lastOut = new Date(outPunches[outPunches.length - 1].log_date)
            calculatedHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60)
          }
      }

      // Detect issues
      if (inPunches.length > 1) {
        issues.push(`Multiple IN punches: ${inPunches.length}`)
      }
      if (outPunches.length > 1) {
        issues.push(`Multiple OUT punches: ${outPunches.length}`)
      }
      if (inPunches.length === 0) {
        issues.push('No IN punch recorded')
        status = 'absent'
      }

      return NextResponse.json({
        success: true,
        data: {
          employeeCode,
          date,
          totalHours: Math.round(calculatedHours * 100) / 100,
          status,
          punches: logs,
          inPunches: inPunches.length,
          outPunches: outPunches.length,
          issues,
          calculationMethod
        }
      })
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
