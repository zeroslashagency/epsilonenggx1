"use client"

import { useState, useEffect } from 'react'
import { User, UserPlus, Shield, ArrowUpDown, Zap, Download, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ZohoLayout } from '../components/zoho-ui'
import * as XLSX from 'xlsx'
import { calculateDateRange } from '@/lib/utils/date-utils'

interface Employee {
  id: string
  full_name: string
  email: string
  role: string
  employee_code?: string
  department?: string
  designation?: string
  status?: string
}

interface AttendanceStats {
  presentDays: number
  absentDays: number
  lateArrivals: number
  totalPunches: number
}

export default function PersonnelPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    presentDays: 0,
    absentDays: 0,
    lateArrivals: 0,
    totalPunches: 0
  })
  const [loadingStats, setLoadingStats] = useState(false)
  const [exportDateRange, setExportDateRange] = useState<string>('month')
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      // Fetch both employees and users to merge data
      const [employeesResponse, usersResponse] = await Promise.all([
        fetch('/api/get-employees'),
        fetch('/api/admin/users')
      ])
      
      const employeesData = await employeesResponse.json()
      const usersData = await usersResponse.json()
      
      if (employeesData.success) {
        // Create a map of users by employee_code for quick lookup
        const usersByEmployeeCode = new Map()
        
        // Add users from database
        if (usersData.success && usersData.data?.users) {
          usersData.data.users.forEach((user: any) => {
            if (user.employee_code) {
              usersByEmployeeCode.set(user.employee_code, user)
            }
          })
        }
        
        // Also check localStorage for created users (workaround for RLS issue)
        const createdUsers = JSON.parse(localStorage.getItem('createdUsers') || '[]')
        
        // Get list of deleted user IDs to filter them out
        const deletedUserIds = JSON.parse(localStorage.getItem('deletedUsers') || '[]')
        
        createdUsers.forEach((user: any) => {
          // Only add if not deleted
          if (user.employee_code && !deletedUserIds.includes(user.id)) {
            usersByEmployeeCode.set(user.employee_code, user)
          }
        })
        
        // Also filter out deleted users from database users
        if (usersData.success && usersData.data?.users) {
          // Remove deleted users from the map
          deletedUserIds.forEach((deletedId: string) => {
            // Find and remove by user ID
            for (const [code, user] of usersByEmployeeCode.entries()) {
              if (user.id === deletedId) {
                usersByEmployeeCode.delete(code)
              }
            }
          })
        }
        
        // Transform employee data, merging with user data where available
        const employeeData = employeesData.employees.map((emp: any) => {
          const matchingUser = usersByEmployeeCode.get(emp.employee_code)
          
          return {
            id: emp.employee_code,
            full_name: emp.employee_name || `Employee ${emp.employee_code}`,
            email: matchingUser?.email || '', // Use real email from user account, or empty
            role: emp.designation || 'Employee',
            employee_code: emp.employee_code,
            department: emp.department || 'Default',
            designation: emp.designation || 'Employee',
            status: emp.status || 'Active',
            hasUserAccount: !!matchingUser
          }
        })
        
        setEmployees(employeeData)
        console.log(`✅ Loaded ${employeeData.length} employees from employee_master`)
        console.log(`📧 ${employeeData.filter((e: any) => e.hasUserAccount).length} have user accounts with real emails`)
      }
    } catch (error) {
      console.error('Failed to load employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || 'U'
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600'
    ]
    return colors[index % colors.length]
  }

  const fetchAttendanceStats = async (employeeCode: string) => {
    if (!employeeCode) {
      console.log('⚠️ No employee code provided, skipping attendance fetch')
      setAttendanceStats({ presentDays: 0, absentDays: 0, lateArrivals: 0, totalPunches: 0 })
      return
    }

    try {
      setLoadingStats(true)
      console.log(`📊 Fetching attendance for employee code: ${employeeCode}`)

      // Always use current month for display stats
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const fromDate = firstDayOfMonth.toISOString().split('T')[0]
      const toDate = lastDayOfMonth.toISOString().split('T')[0]

      // Fetch attendance data for this employee for this month
      const response = await fetch(`/api/get-attendance?employeeCode=${employeeCode}&fromDate=${fromDate}&toDate=${toDate}`)
      const data = await response.json()

      if (data.success && data.data?.allLogs) {
        const logs = data.data.allLogs
        
        // Calculate stats
        const uniqueDates = new Set(logs.map((log: any) => log.log_date?.split('T')[0]))
        const presentDays = uniqueDates.size
        const totalPunches = logs.length
        
        // Count late arrivals (punch IN after 9 AM)
        const lateArrivals = logs.filter((log: any) => {
          const punchTime = new Date(log.log_date)
          const hour = punchTime.getHours()
          return log.punch_direction?.toLowerCase() === 'in' && hour >= 9
        }).length

        setAttendanceStats({
          presentDays,
          absentDays: 0, // Would need working days calculation
          lateArrivals,
          totalPunches
        })

        console.log(`✅ Attendance stats loaded: ${presentDays} days, ${totalPunches} punches, ${lateArrivals} late`)
      } else {
        console.log('⚠️ No attendance data found')
        setAttendanceStats({ presentDays: 0, absentDays: 0, lateArrivals: 0, totalPunches: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error)
      setAttendanceStats({ presentDays: 0, absentDays: 0, lateArrivals: 0, totalPunches: 0 })
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (selectedEmployee?.employee_code) {
      fetchAttendanceStats(selectedEmployee.employee_code)
    }
  }, [selectedEmployee])

  const getDateRangeLabel = () => {
    const labels: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'week': 'This Week',
      'prev-week': 'Previous Week',
      'month': 'This Month',
      'prev-month': 'Previous Month',
      'quarter': 'This Quarter',
      'prev-quarter': 'Previous Quarter',
      'year': 'This Year',
      'prev-year': 'Previous Year'
    }
    return labels[exportDateRange] || 'This Month'
  }

  const calculateDateRange = (range: string) => {
    const now = new Date()
    let fromDate: string
    let toDate: string

    switch (range) {
      case 'today':
        fromDate = toDate = now.toISOString().split('T')[0]
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        fromDate = toDate = yesterday.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - now.getDay())
        fromDate = weekStart.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
        break
      case 'prev-week':
        const prevWeekEnd = new Date(now)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - now.getDay() - 1)
        const prevWeekStart = new Date(prevWeekEnd)
        prevWeekStart.setDate(prevWeekStart.getDate() - 6)
        fromDate = prevWeekStart.toISOString().split('T')[0]
        toDate = prevWeekEnd.toISOString().split('T')[0]
        break
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        fromDate = monthStart.toISOString().split('T')[0]
        toDate = monthEnd.toISOString().split('T')[0]
        break
      case 'prev-month':
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        fromDate = prevMonthStart.toISOString().split('T')[0]
        toDate = prevMonthEnd.toISOString().split('T')[0]
        break
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        fromDate = quarterStart.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
        break
      case 'prev-quarter':
        const prevQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
        const prevQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
        fromDate = prevQuarterStart.toISOString().split('T')[0]
        toDate = prevQuarterEnd.toISOString().split('T')[0]
        break
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        fromDate = yearStart.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
        break
      case 'prev-year':
        const prevYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31)
        fromDate = prevYearStart.toISOString().split('T')[0]
        toDate = prevYearEnd.toISOString().split('T')[0]
        break
      default:
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        fromDate = defaultStart.toISOString().split('T')[0]
        toDate = defaultEnd.toISOString().split('T')[0]
    }

    return { fromDate, toDate }
  }

  const downloadAttendanceExcel = async () => {
    if (!selectedEmployee?.employee_code) return

    try {
      const { fromDate, toDate } = calculateDateRange(exportDateRange)

      // Fetch attendance data
      const response = await fetch(`/api/get-attendance?employeeCode=${selectedEmployee.employee_code}&fromDate=${fromDate}&toDate=${toDate}`)
      const data = await response.json()

      if (data.success && data.data?.allLogs && data.data.allLogs.length > 0) {
        const logs = data.data.allLogs

        // Prepare Excel data with proper formatting
        const excelData = logs.map((log: any) => {
          const logDate = new Date(log.log_date)
          return {
            'Date': logDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            'Time': logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            'Day': logDate.toLocaleDateString('en-US', { weekday: 'long' }),
            'Direction': log.punch_direction || 'N/A',
            'Employee Code': log.employee_code || selectedEmployee.employee_code,
            'Employee Name': selectedEmployee.full_name,
            'Department': selectedEmployee.department || 'N/A',
            'Designation': selectedEmployee.designation || 'N/A'
          }
        })

        // Create workbook with proper column widths
        const ws = XLSX.utils.json_to_sheet(excelData)
        
        // Set column widths
        ws['!cols'] = [
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 12 }, // Day
          { wch: 10 }, // Direction
          { wch: 15 }, // Employee Code
          { wch: 25 }, // Employee Name
          { wch: 20 }, // Department
          { wch: 20 }  // Designation
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

        // Download with proper filename
        const fileName = `${selectedEmployee.full_name.replace(/\s+/g, '_')}_Attendance_${getDateRangeLabel().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)

        console.log(`✅ Downloaded ${logs.length} attendance records for ${selectedEmployee.full_name}`)
        alert(`Successfully exported ${logs.length} attendance records!`)
      } else {
        console.warn('⚠️ No attendance data found')
        alert(`No attendance data found for ${selectedEmployee.full_name} in the selected period (${getDateRangeLabel()})`)
      }
    } catch (error) {
      console.error('Failed to download attendance:', error)
      alert('Failed to download attendance data. Please try again.')
    }
  }

  return (
    <ZohoLayout breadcrumbs={[{ label: 'Production' }, { label: 'Personnel' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#12263F] dark:text-white">Personnel Management</h1>
            <p className="text-[#95AAC9] mt-1">View detailed employee profiles and attendance tracking</p>
          </div>
          {selectedEmployee && (
            <button
              onClick={() => setSelectedEmployee(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
            >
              ← Back to List
            </button>
          )}
        </div>

        {/* Conditional View: Grid or Detail */}
        {!selectedEmployee ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-3 text-center py-12 text-[#95AAC9]">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-[#95AAC9]">No employees found</div>
            ) : (
              employees.map((employee, index) => (
                <div
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {getInitials(employee.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#12263F] dark:text-white truncate">
                        {employee.full_name}
                      </h3>
                      {employee.email ? (
                        <p className="text-sm text-[#95AAC9] truncate">{employee.email}</p>
                      ) : (
                        <p className="text-sm text-[#95AAC9] italic">No user account</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-[#E3E6F0] dark:bg-gray-700 text-[#12263F] dark:text-white rounded">
                          {employee.role || 'Employee'}
                        </span>
                        {employee.employee_code && (
                          <span className="text-xs px-2 py-0.5 bg-[#12263F] text-white rounded">
                            #{employee.employee_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#95AAC9]">Department:</span>
                      <span className="text-[#12263F] dark:text-white font-medium">
                        {employee.department || 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#95AAC9]">Designation:</span>
                      <span className="text-[#12263F] dark:text-white font-medium">
                        {employee.designation || 'Not Set'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 bg-gradient-to-br ${getAvatarColor(employees.findIndex(e => e.id === selectedEmployee.id))} rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4`}>
                    {getInitials(selectedEmployee.full_name)}
                  </div>
                  <h2 className="text-xl font-semibold text-[#12263F] dark:text-white">{selectedEmployee.full_name}</h2>
                  {selectedEmployee.email ? (
                    <p className="text-sm text-[#95AAC9]">{selectedEmployee.email}</p>
                  ) : (
                    <p className="text-sm text-[#95AAC9] italic">No user account</p>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#95AAC9]">Employee ID:</span>
                    <span className="text-[#12263F] dark:text-white font-medium">#{selectedEmployee.employee_code || '4'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#95AAC9]">Role:</span>
                    <span className="text-[#12263F] dark:text-white font-medium">{selectedEmployee.role || 'Operator'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#95AAC9]">Department:</span>
                    <span className="text-[#12263F] dark:text-white font-medium">{selectedEmployee.department || 'Default'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#95AAC9]">Designation:</span>
                    <span className="text-[#12263F] dark:text-white font-medium">{selectedEmployee.designation || 'Employee'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#95AAC9]">Phone:</span>
                    <span className="text-[#12263F] dark:text-white font-medium">Not Set</span>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                  <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {loadingStats ? '...' : attendanceStats.presentDays}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-500">Present Days</p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {loadingStats ? '...' : attendanceStats.absentDays}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-500">Absent Days</p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {loadingStats ? '...' : attendanceStats.lateArrivals}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-500">Late Arrivals</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {loadingStats ? '...' : attendanceStats.totalPunches}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-500">Total Punches</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Attendance Details */}
            <div className="col-span-8 space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{loadingStats ? '...' : attendanceStats.presentDays}</div>
                  <div className="text-sm opacity-90 mt-1">Days Present</div>
                  <div className="text-xs opacity-75 mt-2">This Month</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{loadingStats ? '...' : attendanceStats.totalPunches}</div>
                  <div className="text-sm opacity-90 mt-1">Total Punches</div>
                  <div className="text-xs opacity-75 mt-2">In/Out Records</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">{loadingStats ? '...' : attendanceStats.lateArrivals}</div>
                  <div className="text-sm opacity-90 mt-1">Late Arrivals</div>
                  <div className="text-xs opacity-75 mt-2">After 9:00 AM</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold">
                    {loadingStats ? '...' : attendanceStats.presentDays > 0 
                      ? `${Math.round((attendanceStats.lateArrivals / attendanceStats.presentDays) * 100)}%`
                      : '0%'
                    }
                  </div>
                  <div className="text-sm opacity-90 mt-1">Late Ratio</div>
                  <div className="text-xs opacity-75 mt-2">Performance</div>
                </div>
              </div>

              {/* Attendance Chart */}
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Attendance Summary</h3>
                    <p className="text-sm text-[#95AAC9]">Monthly attendance tracking and performance</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowDateDropdown(!showDateDropdown)}
                        className="flex items-center gap-2 px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors text-sm text-[#12263F] dark:text-white"
                      >
                        <Calendar className="w-4 h-4" />
                        {getDateRangeLabel()}
                      </button>
                      {showDateDropdown && (
                        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg shadow-lg z-10 w-48">
                          {['today', 'yesterday', 'week', 'prev-week', 'month', 'prev-month', 'quarter', 'prev-quarter', 'year', 'prev-year'].map((range) => (
                            <button
                              key={range}
                              onClick={() => {
                                setExportDateRange(range)
                                setShowDateDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 text-sm text-[#12263F] dark:text-white"
                            >
                              {getDateRangeLabel().replace(getDateRangeLabel(), 
                                range === 'today' ? 'Today' :
                                range === 'yesterday' ? 'Yesterday' :
                                range === 'week' ? 'This Week' :
                                range === 'prev-week' ? 'Previous Week' :
                                range === 'month' ? 'This Month' :
                                range === 'prev-month' ? 'Previous Month' :
                                range === 'quarter' ? 'This Quarter' :
                                range === 'prev-quarter' ? 'Previous Quarter' :
                                range === 'year' ? 'This Year' :
                                'Previous Year'
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={downloadAttendanceExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export Excel
                    </button>
                  </div>
                </div>
                
                {loadingStats ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C7BE5] mx-auto mb-4"></div>
                      <p className="text-[#95AAC9]">Loading attendance data...</p>
                    </div>
                  </div>
                ) : attendanceStats.totalPunches > 0 ? (
                  <div className="space-y-6">
                    {/* Visual Progress Bars */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-[#12263F] dark:text-white font-medium">Attendance Rate</span>
                          <span className="text-green-600 font-bold">
                            {Math.round((attendanceStats.presentDays / 30) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((attendanceStats.presentDays / 30) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-[#12263F] dark:text-white font-medium">Punctuality Score</span>
                          <span className="text-blue-600 font-bold">
                            {attendanceStats.presentDays > 0 
                              ? Math.round(((attendanceStats.presentDays - attendanceStats.lateArrivals) / attendanceStats.presentDays) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                            style={{ 
                              width: `${attendanceStats.presentDays > 0 
                                ? ((attendanceStats.presentDays - attendanceStats.lateArrivals) / attendanceStats.presentDays) * 100
                                : 0
                              }%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{attendanceStats.presentDays}</div>
                        <div className="text-xs text-[#95AAC9] mt-1">Days Worked</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{attendanceStats.lateArrivals}</div>
                        <div className="text-xs text-[#95AAC9] mt-1">Late Days</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {attendanceStats.presentDays - attendanceStats.lateArrivals}
                        </div>
                        <div className="text-xs text-[#95AAC9] mt-1">On-Time Days</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <User className="w-16 h-16 text-[#95AAC9] mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-[#12263F] dark:text-white">No Attendance Data</h4>
                      <p className="text-sm text-[#95AAC9]">No attendance records found for this month</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
