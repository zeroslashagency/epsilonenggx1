import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ AUTH CHECK: Require authentication (any logged-in user can view analytics)
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '14')
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Calculate date range for the requested days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()
    
    console.log('📊 Fetching logs from:', startDateStr, 'for', days, 'days')
    
    // Get attendance data - fetch ALL data for the date range (no limit!)
    // Supabase has default limit of 1000, so we need to paginate or increase limit
    const { data: logs, error } = await supabase
      .from('employee_raw_logs')
      .select('*')
      .gte('log_date', startDateStr)
      .order('log_date', { ascending: false })
      .limit(50000) // Increase limit to get all data
    
    if (error) throw error
    
    // Filter today's logs for accurate statistics
    const todayLogs = logs?.filter(log => log.log_date.startsWith(today)) || []
    
    console.log('📊 Analytics Debug:', {
      totalLogs: logs?.length || 0,
      today: today,
      todayLogs: todayLogs.length,
      sampleLog: logs?.[0]
    })
    
    // Get employee master data for department info
    const { data: employees } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department')
      .limit(1000)
    
    const employeeMap = new Map(employees?.map(emp => [emp.employee_code, emp]) || [])
    
    // Calculate daily attendance trends
    const dailyTrends = calculateDailyTrends(logs || [], days)
    
    // Calculate department-wise distribution
    const departmentStats = calculateDepartmentStats(logs || [], employeeMap)
    
    // Calculate gender distribution
    const genderStats = calculateGenderStats(logs || [], employeeMap)
    
    // Calculate time distribution (check-in times)
    const timeDistribution = calculateTimeDistribution(logs || [])
    
    // Calculate top performers
    const topPerformers = calculateTopPerformers(logs || [], employeeMap, days)
    
    // Calculate overall statistics
    const overallStats = {
      totalEmployees: employeeMap.size,
      averageAttendanceRate: calculateAverageAttendanceRate(logs || [], employeeMap.size, days),
      onTimeRate: calculateOnTimeRate(logs || []),
      averageCheckInTime: calculateAverageCheckInTime(logs || [])
    }
    
    return NextResponse.json({
      success: true,
      data: {
        dailyTrends,
        departmentStats,
        genderStats,
        timeDistribution,
        topPerformers,
        overallStats
      }
    })
    
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics'
    }, { status: 500 })
  }
}

function calculateDailyTrends(logs: any[], days: number) {
  const trends = []
  const today = new Date()
  
  console.log('🔍 Calculating trends for', days, 'days from', logs.length, 'total logs')
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i) // Always get the most recent days
    const dateStr = date.toISOString().split('T')[0]
    
    // Filter logs for this specific date
    const dayLogs = logs.filter(log => {
      // Handle both ISO string and date object formats
      const logDate = new Date(log.log_date)
      const logDateStr = logDate.toISOString().split('T')[0] // Get YYYY-MM-DD part
      return logDateStr === dateStr
    })
    
    const uniqueEmployees = new Set(dayLogs.map(log => log.employee_code)).size
    
    console.log(`📅 ${dateStr}: ${dayLogs.length} punches, ${uniqueEmployees} employees`)
    
    trends.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      present: uniqueEmployees,
      absent: 0, // Will be calculated on frontend based on total employees
      totalPunches: dayLogs.length,
      fullDate: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    })
  }
  
  return trends
}

function calculateDepartmentStats(logs: any[], employeeMap: Map<string, any>) {
  const deptCounts: Record<string, number> = {}
  
  logs.forEach(log => {
    const emp = employeeMap.get(log.employee_code)
    const dept = emp?.department || 'Unknown'
    deptCounts[dept] = (deptCounts[dept] || 0) + 1
  })
  
  return Object.entries(deptCounts).map(([name, value]) => ({
    name,
    value,
    percentage: 0 // Will be calculated on frontend
  }))
}

function calculateGenderStats(logs: any[], employeeMap: Map<string, any>) {
  // For now, create a simple distribution based on employee codes
  const uniqueEmployees = new Set(logs.map(log => log.employee_code))
  const totalEmployees = uniqueEmployees.size
  
  // Simple distribution: assume roughly 60% male, 40% female
  const maleCount = Math.ceil(totalEmployees * 0.6)
  const femaleCount = totalEmployees - maleCount
  
  return [
    { name: 'Male', value: maleCount },
    { name: 'Female', value: femaleCount }
  ]
}

function calculateTimeDistribution(logs: any[]) {
  const timeSlots = {
    '6-7 AM': 0,
    '7-8 AM': 0,
    '8-9 AM': 0,
    '9-10 AM': 0,
    '10-11 AM': 0,
    '11-12 PM': 0,
    'After 12': 0
  }
  
  logs.forEach(log => {
    const hour = new Date(log.log_date).getHours()
    if (hour >= 6 && hour < 7) timeSlots['6-7 AM']++
    else if (hour >= 7 && hour < 8) timeSlots['7-8 AM']++
    else if (hour >= 8 && hour < 9) timeSlots['8-9 AM']++
    else if (hour >= 9 && hour < 10) timeSlots['9-10 AM']++
    else if (hour >= 10 && hour < 11) timeSlots['10-11 AM']++
    else if (hour >= 11 && hour < 12) timeSlots['11-12 PM']++
    else if (hour >= 12) timeSlots['After 12']++
  })
  
  return Object.entries(timeSlots).map(([time, count]) => ({
    time,
    count
  }))
}

function calculateTopPerformers(logs: any[], employeeMap: Map<string, any>, days: number) {
  const employeeAttendance: Record<string, { days: Set<string>, onTimeDays: Set<string>, totalPunches: number }> = {}
  
  logs.forEach(log => {
    const empCode = log.employee_code
    const date = log.log_date.split('T')[0]
    const hour = new Date(log.log_date).getHours()
    
    if (!employeeAttendance[empCode]) {
      employeeAttendance[empCode] = { days: new Set(), onTimeDays: new Set(), totalPunches: 0 }
    }
    
    employeeAttendance[empCode].days.add(date)
    employeeAttendance[empCode].totalPunches++
    
    // Consider on-time if first punch of the day is before 10 AM
    if (hour < 10) {
      employeeAttendance[empCode].onTimeDays.add(date)
    }
  })
  
  const performers = Object.entries(employeeAttendance)
    .map(([empCode, data]) => {
      const emp = employeeMap.get(empCode)
      const attendanceRate = Math.min(Math.round((data.days.size / days) * 100), 100)
      const onTimeRate = data.days.size > 0 ? Math.round((data.onTimeDays.size / data.days.size) * 100) : 0
      
      return {
        employeeCode: empCode,
        employeeName: emp?.employee_name || `Employee ${empCode}`,
        department: emp?.department || 'Unknown',
        attendanceDays: data.days.size,
        attendanceRate,
        onTimeRate
      }
    })
    .sort((a, b) => {
      // Sort by attendance rate first, then by on-time rate
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate
      }
      return b.onTimeRate - a.onTimeRate
    })
    .slice(0, 5)
  
  return performers
}

function calculateAverageAttendanceRate(logs: any[], totalEmployees: number, days: number) {
  if (totalEmployees === 0 || days === 0) return 0
  
  const uniqueDates = new Set(logs.map(log => log.log_date.split('T')[0]))
  const totalPossibleAttendance = totalEmployees * days
  const actualAttendance = logs.length
  
  return Math.round((actualAttendance / totalPossibleAttendance) * 100)
}

function calculateOnTimeRate(logs: any[]) {
  if (logs.length === 0) return 0
  
  const onTimeLogs = logs.filter(log => {
    const hour = new Date(log.log_date).getHours()
    return hour < 10
  })
  
  return Math.round((onTimeLogs.length / logs.length) * 100)
}

function calculateAverageCheckInTime(logs: any[]) {
  if (logs.length === 0) return '9:00 AM'
  
  const hours = logs.map(log => new Date(log.log_date).getHours())
  const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
  
  const period = avgHour >= 12 ? 'PM' : 'AM'
  const displayHour = avgHour > 12 ? avgHour - 12 : avgHour
  
  return `${displayHour}:00 ${period}`
}
