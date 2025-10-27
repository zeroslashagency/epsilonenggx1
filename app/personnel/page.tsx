"use client"

import { useState, useEffect } from 'react'
import { User, UserPlus, Shield, ArrowUpDown, Zap } from 'lucide-react'
import Link from 'next/link'
import { ZohoLayout } from '../components/zoho-ui'

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

      // Calculate this month's date range
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

  return (
    <ZohoLayout breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="flex items-center gap-2 px-6">
            <Link href="/settings/users" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <User className="w-4 h-4" />
              User Management
            </Link>
            <Link href="/settings/add-users" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <UserPlus className="w-4 h-4" />
              Add Users
            </Link>
            <Link href="/settings/roles" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Shield className="w-4 h-4" />
              Role Profiles
            </Link>
            <Link href="/settings/activity-logs" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Zap className="w-4 h-4" />
              Activity Logging
            </Link>
          </div>
        </div>

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

            {/* Right: Attendance Chart */}
            <div className="col-span-8">
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6 h-full">
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Attendance Summary</h3>
                <p className="text-sm text-[#95AAC9] mb-6">This month's attendance tracking</p>
                <div className="flex items-center justify-center h-80">
                  {selectedEmployee?.employee_code ? (
                    <div className="text-center">
                      {loadingStats ? (
                        <div className="text-[#95AAC9]">Loading attendance data...</div>
                      ) : attendanceStats.totalPunches > 0 ? (
                        <div className="w-full">
                          <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-green-600">{attendanceStats.presentDays}</p>
                              <p className="text-sm text-[#95AAC9] mt-2">Days Present</p>
                            </div>
                            <div className="text-center">
                              <p className="text-4xl font-bold text-blue-600">{attendanceStats.totalPunches}</p>
                              <p className="text-sm text-[#95AAC9] mt-2">Total Punches</p>
                            </div>
                          </div>
                          <div className="text-center mt-8">
                            <p className="text-2xl font-bold text-yellow-600">{attendanceStats.lateArrivals}</p>
                            <p className="text-sm text-[#95AAC9] mt-2">Late Arrivals (after 9 AM)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <User className="w-16 h-16 text-[#95AAC9] mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-[#12263F] dark:text-white">No Attendance Data</h4>
                          <p className="text-sm text-[#95AAC9]">No attendance records found for this month</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <User className="w-16 h-16 text-[#95AAC9] mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-[#12263F] dark:text-white">No Employee Code</h4>
                      <p className="text-sm text-[#95AAC9]">This employee doesn't have an employee code assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
