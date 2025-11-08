"use client"

import { useState, useEffect } from 'react'
import { Download, RefreshCw, Calendar, Users, TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle, Filter, ChevronDown, FileText, User, Search, Building2, Briefcase, UserCheck, Activity, UserX } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiGet } from '@/app/lib/utils/api-client'
import { ZohoLayout } from '../components/zoho-ui'
import { calculateDateRange } from '@/lib/utils/date-utils'
import { RecentAttendanceRecords } from '@/components/RecentAttendanceRecords'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import CalendarTab from './components/CalendarTab'
import GamificationTab from './components/GamificationTab'
import CelebrationsTab from './components/CelebrationsTab'
import ShiftLeaveTab from './components/ShiftLeaveTab'
import AnalyticsTab from './components/AnalyticsTab'
import AuditSecurityTab from './components/AuditSecurityTab'
import ReportsTab from './components/ReportsTab'

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

function PersonnelPageContent() {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [employeeAttendance, setEmployeeAttendance] = useState<Record<string, any>>({})
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [activeTab, setActiveTab] = useState<string>('overview')

  useEffect(() => {
    let isMounted = true
    
    const loadPersonnel = async () => {
      setLoading(true)
      try {
        const data = await apiGet('/api/admin/raw-attendance')
        
        if (isMounted && data.success) {
          const employees = data.data || []
          const uniqueEmployees = Array.from(new Map(
            employees.map((e: any) => [e.employee_id, e])
          ).values()) as Employee[]
          setEmployees(uniqueEmployees)
        }
      } catch (error) {
        if (isMounted) {
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadPersonnel()
    
    return () => {
      isMounted = false
    }
  }, [])

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
        
        // Fetch attendance for all employees
        fetchAllEmployeeAttendance(employeeData)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const fetchAllEmployeeAttendance = async (employeeList: Employee[]) => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const fromDate = firstDayOfMonth.toISOString().split('T')[0]
    const toDate = lastDayOfMonth.toISOString().split('T')[0]
    
    // Calculate working days elapsed in the month (excluding weekends)
    const today = new Date()
    let workingDaysElapsed = 0
    for (let d = new Date(firstDayOfMonth); d <= today && d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDaysElapsed++
      }
    }

    try {
      // Fetch all attendance data in a single API call
      const data = await apiGet(`/api/get-attendance?fromDate=${fromDate}&toDate=${toDate}`)
      
      if (data.success && data.data?.allLogs) {
        const attendanceData: Record<string, any> = {}
        const allLogs = data.data.allLogs
        
        // Group logs by employee code
        const logsByEmployee: Record<string, any[]> = {}
        allLogs.forEach((log: any) => {
          if (log.employee_code) {
            if (!logsByEmployee[log.employee_code]) {
              logsByEmployee[log.employee_code] = []
            }
            logsByEmployee[log.employee_code].push(log)
          }
        })
        
        // Calculate stats for each employee
        Object.entries(logsByEmployee).forEach(([employeeCode, logs]) => {
          if (logs.length > 0) {
            // Filter logs to only include current month
            const monthLogs = logs.filter((log: any) => {
              const logDate = new Date(log.log_date)
              return logDate >= firstDayOfMonth && logDate <= lastDayOfMonth
            })
            
            // Count only working days (Mon-Fri) from the logs
            const workingDaysPresent = monthLogs.reduce((count: number, log: any) => {
              const logDate = new Date(log.log_date)
              const dayOfWeek = logDate.getDay()
              const dateStr = log.log_date?.split('T')[0]
              // Only count if it's a weekday and we haven't counted this date yet
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                return count
              }
              return count
            }, 0)
            
            const uniqueDates = new Set(
              monthLogs
                .filter((log: any) => {
                  const logDate = new Date(log.log_date)
                  const dayOfWeek = logDate.getDay()
                  return dayOfWeek !== 0 && dayOfWeek !== 6 // Only weekdays
                })
                .map((log: any) => log.log_date?.split('T')[0])
            )
            const presentDays = uniqueDates.size
            
            const lateArrivals = monthLogs.filter((log: any) => {
              const punchTime = new Date(log.log_date)
              const hour = punchTime.getHours()
              return log.punch_direction?.toLowerCase() === 'in' && hour >= 9
            }).length
            
            // Check if employee came today
            const today = new Date().toISOString().split('T')[0]
            const todayPresent = monthLogs.some((log: any) => {
              const logDate = log.log_date?.split('T')[0]
              return logDate === today
            })
            
            // Calculate attendance rate based on working days elapsed
            const attendanceRate = workingDaysElapsed > 0 
              ? Math.min(Math.round((presentDays / workingDaysElapsed) * 100), 100)
              : 0
            
            attendanceData[employeeCode] = {
              presentDays,
              lateArrivals,
              attendanceRate,
              totalPunches: monthLogs.length,
              todayPresent
            }
          }
        })
        
        setEmployeeAttendance(attendanceData)
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
      setEmployeeAttendance({})
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
      setAttendanceStats({ presentDays: 0, absentDays: 0, lateArrivals: 0, totalPunches: 0 })
      return
    }

    try {
      setLoadingStats(true)

      // Always use current month for display stats
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const fromDate = firstDayOfMonth.toISOString().split('T')[0]
      const toDate = lastDayOfMonth.toISOString().split('T')[0]

      // Fetch attendance data for this employee for this month
      const data = await apiGet(`/api/get-attendance?employeeCode=${employeeCode}&fromDate=${fromDate}&toDate=${toDate}`)

      if (data.success && data.data?.allLogs) {
        const logs = data.data.allLogs
        
        // Calculate weekly activity (last 7 days)
        const today = new Date()
        const weekActivity = [0, 0, 0, 0, 0, 0, 0] // Mon-Sun
        
        logs.forEach((log: any) => {
          const logDate = new Date(log.log_date)
          const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff >= 0 && daysDiff < 7) {
            const dayOfWeek = logDate.getDay() // 0=Sun, 1=Mon, etc
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Mon=0, Sun=6
            weekActivity[adjustedDay]++
          }
        })
        
        setWeeklyActivity(weekActivity)
        
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

      } else {
        setAttendanceStats({ presentDays: 0, absentDays: 0, lateArrivals: 0, totalPunches: 0 })
      }
    } catch (error) {
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

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const downloadAttendanceExcel = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee first')
      return
    }

    try {
      const { fromDate: fromDateParam, toDate: toDateParam } = calculateDateRange(exportDateRange)
      const data = await apiGet(`/api/get-attendance?employeeCode=${selectedEmployee.employee_code}&fromDate=${fromDateParam}&toDate=${toDateParam}`)

      if (data.success && data.data?.allLogs && data.data.allLogs.length > 0) {
        const logs = data.data.allLogs
        const startDate = new Date(fromDateParam)
        const endDate = new Date(toDateParam)

        // Generate ALL dates in the range
        const allDates: Date[] = []
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          allDates.push(new Date(d))
        }

        // Create sheet data
        const sheetData: any[] = []
        
        // Add employee name header
        sheetData.push([selectedEmployee.full_name.toUpperCase()])
        sheetData.push([]) // Empty row

        // Calculate if multi-month
        const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                            'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
        const firstDate = new Date(startDate)
        const lastDate = new Date(endDate)
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                           (lastDate.getMonth() - firstDate.getMonth())
        const isMultiMonth = monthsDiff >= 2

        let calendarRows: any[] = []
        
        if (!isMultiMonth) {
          const monthName = monthNames[firstDate.getMonth()]
          const year = firstDate.getFullYear()
          const firstDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
          const lastDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0)
          const daysInMonth = lastDayOfMonth.getDate()
          const startDayOfWeek = firstDayOfMonth.getDay()
          
          calendarRows.push(['', '', `${monthName} ${year} CALENDAR`])
          calendarRows.push(['', '', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
          
          let dayCounter = 1
          const weeksNeeded = Math.ceil((startDayOfWeek + daysInMonth) / 7)
          
          for (let week = 0; week < weeksNeeded; week++) {
            const weekRow = ['', '']
            for (let day = 0; day < 7; day++) {
              const cellIndex = week * 7 + day
              if (cellIndex < startDayOfWeek || dayCounter > daysInMonth) {
                weekRow.push('')
              } else {
                weekRow.push(dayCounter.toString())
                dayCounter++
              }
            }
            calendarRows.push(weekRow)
          }
        }

        // Find max punches for this employee
        let employeeMaxPunches = 0
        allDates.forEach(date => {
          const dateLogs = logs.filter((log: any) => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
          })
          if (dateLogs.length > employeeMaxPunches) {
            employeeMaxPunches = dateLogs.length
          }
        })

        // Create header with punch columns
        const header = ['Date']
        for (let i = 1; i <= employeeMaxPunches; i++) {
          header.push(`Punch ${i}`)
        }
        header.push('Status')

        // Add calendar day headers
        if (!isMultiMonth && calendarRows.length > 0) {
          header.push('')
          header.push('Sun')
          header.push('Mon')
          header.push('Tue')
          header.push('Wed')
          header.push('Thu')
          header.push('Fri')
          header.push('Sat')
        }

        sheetData.push(header)

        // Add data for each date
        allDates.forEach((date, dateIndex) => {
          const dateKey = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
          })

          const dateLogs = logs.filter((log: any) => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
          })

          const sortedDateLogs = dateLogs.sort((a: any, b: any) => 
            new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
          )

          const row = [dateKey]

          // Add each punch in its own column
          sortedDateLogs.forEach((log: any) => {
            const time = new Date(log.log_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
            row.push(time)
          })

          // Fill remaining punch columns
          while (row.length < employeeMaxPunches + 1) {
            row.push('')
          }

          // Add status
          row.push(dateLogs.length > 0 ? 'Present' : 'Absent')

          // Add calendar columns
          if (!isMultiMonth && calendarRows.length > 0) {
            row.push('')
            if (dateIndex + 2 < calendarRows.length) {
              const calendarRow = calendarRows[dateIndex + 2] || []
              for (let i = 2; i < 9; i++) {
                row.push(calendarRow[i] || '')
              }
            } else {
              for (let i = 0; i < 7; i++) {
                row.push('')
              }
            }
          }

          sheetData.push(row)
        })

        // Add attendance summary
        const totalDays = allDates.length
        const dataRows = sheetData.slice(3)
        const statusColumnIndex = employeeMaxPunches + 1
        const presentDays = dataRows.filter(row => row[statusColumnIndex] === 'Present').length
        const absentDays = totalDays - presentDays
        const attendancePercent = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0.00'

        let totalPunches = 0
        let maxPunchesInDay = 0
        let maxPunchesDate = ''
        let minPunchesInDay = Infinity
        let minPunchesDate = ''
        let oddPunchDays = 0

        dataRows.forEach((row) => {
          const status = row[statusColumnIndex]
          if (status === 'Present') {
            let dayPunches = 0
            for (let i = 1; i < statusColumnIndex; i++) {
              if (row[i] && row[i] !== '') {
                dayPunches++
              }
            }

            totalPunches += dayPunches

            if (dayPunches > maxPunchesInDay) {
              maxPunchesInDay = dayPunches
              maxPunchesDate = row[0]
            }

            if (dayPunches > 0 && dayPunches < minPunchesInDay) {
              minPunchesInDay = dayPunches
              minPunchesDate = row[0]
            }

            if (dayPunches % 2 !== 0) {
              oddPunchDays++
            }
          }
        })

        const avgPunches = presentDays > 0 ? (totalPunches / presentDays).toFixed(2) : '0.00'
        const minPunchesDisplay = minPunchesInDay === Infinity ? 0 : minPunchesInDay

        const summaryRows = [
          [],
          ['ATTENDANCE SUMMARY'],
          ['Total Days in Period', totalDays],
          ['Present Days', presentDays],
          ['Absent Days', absentDays],
          ['Attendance %', `${attendancePercent}%`],
          [],
          ['PUNCH ANALYTICS'],
          ['Total Punches', totalPunches],
          ['Average Punches/Day', avgPunches],
          ['Max Punches in a Day', `${maxPunchesInDay} (${maxPunchesDate})`],
          ['Min Punches in a Day', `${minPunchesDisplay} (${minPunchesDate})`],
          ['Days with Odd Punches', oddPunchDays]
        ]

        if (!isMultiMonth && calendarRows.length > 0) {
          summaryRows.forEach((summaryRow, idx) => {
            const fullRow = [...summaryRow]
            while (fullRow.length < employeeMaxPunches + 2) {
              fullRow.push('')
            }
            if (idx < calendarRows.length) {
              fullRow.push('')
              const calendarRow = calendarRows[idx] || []
              for (let i = 2; i < 9; i++) {
                fullRow.push(calendarRow[i] || '')
              }
            }
            sheetData.push(fullRow)
          })
        } else {
          summaryRows.forEach(row => sheetData.push(row))
        }

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(sheetData)

        // Set column widths
        const colWidths = [{ width: 15 }]
        for (let i = 0; i < employeeMaxPunches; i++) {
          colWidths.push({ width: 12 })
        }
        colWidths.push({ width: 12 })
        if (!isMultiMonth) {
          colWidths.push({ width: 5 })
          for (let i = 0; i < 7; i++) {
            colWidths.push({ width: 8 })
          }
        }
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, selectedEmployee.full_name.substring(0, 31))

        const fileName = `${selectedEmployee.full_name.replace(/\s+/g, '_')}_Attendance_${getDateRangeLabel().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)

        alert(`Successfully exported ${logs.length} attendance records!`)
      } else {
        alert(`No attendance data found for ${selectedEmployee.full_name} in the selected period (${getDateRangeLabel()})`)
      }
    } catch (error) {
      alert('Failed to download attendance data. Please try again.')
    }
  }

  return (
    <ZohoLayout breadcrumbs={[{ label: 'Production' }, { label: 'Personnel' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#12263F] dark:text-white">Personnel Management</h1>
            <p className="text-[#95AAC9] mt-1 text-sm">View detailed employee profiles and attendance tracking</p>
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
          <>
            {/* Quick Overview Stats - Attendance Dashboard Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              {/* Total Employees */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border border-indigo-200 dark:border-indigo-800 shadow-lg hover:shadow-indigo-300 dark:hover:shadow-indigo-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 p-6 rounded-lg cursor-pointer group">
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-indigo-700 dark:text-indigo-300">Total Employees</h3>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 group-hover:bg-indigo-300 dark:group-hover:bg-indigo-700 transition-colors">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-indigo-900 dark:text-indigo-100">{employees.length}</p>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">All registered employees</p>
                </div>
              </div>

              {/* Active Employees */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800 shadow-lg hover:shadow-emerald-300 dark:hover:shadow-emerald-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 p-4 sm:p-6 rounded-lg cursor-pointer group">
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-emerald-700 dark:text-emerald-300">Active</h3>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 group-hover:bg-emerald-300 dark:group-hover:bg-emerald-700 transition-colors">
                    <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
                    {Object.keys(employeeAttendance).length}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Employees with attendance this month</p>
                </div>
              </div>

              {/* Departments */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-purple-300 dark:hover:shadow-purple-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 p-6 rounded-lg cursor-pointer group">
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-purple-700 dark:text-purple-300">Departments</h3>
                  <div className="p-2.5 rounded-xl bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 group-hover:bg-purple-300 dark:group-hover:bg-purple-700 transition-colors">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-purple-900 dark:text-purple-100">
                    {new Set(employees.map(e => e.department)).size}
                  </p>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Unique departments</p>
                </div>
              </div>

              {/* Today Active Users */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-orange-300 dark:hover:shadow-orange-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 p-6 rounded-lg cursor-pointer group">
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-orange-700 dark:text-orange-300">Today Active Users</h3>
                  <div className="p-2.5 rounded-xl bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 group-hover:bg-orange-300 dark:group-hover:bg-orange-700 transition-colors">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-orange-900 dark:text-orange-100">
                    {(() => {
                      const today = new Date().toISOString().split('T')[0]
                      return Object.entries(employeeAttendance).filter(([code, data]: [string, any]) => {
                        // Check if employee has any attendance logs for today
                        return data.todayPresent === true
                      }).length
                    })()}
                  </p>
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Employees who came today</p>
                </div>
              </div>

              {/* Avg Attendance */}
              <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 border border-sky-200 dark:border-sky-800 shadow-lg hover:shadow-sky-300 dark:hover:shadow-sky-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 p-6 rounded-lg cursor-pointer group">
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-sky-700 dark:text-sky-300">Avg Attendance</h3>
                  <div className="p-2.5 rounded-xl bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-200 group-hover:bg-sky-300 dark:group-hover:bg-sky-700 transition-colors">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-bold tracking-tight text-sky-900 dark:text-sky-100">
                    {Object.keys(employeeAttendance).length > 0
                      ? Math.round(Object.values(employeeAttendance).reduce((sum: number, a: any) => sum + (a.attendanceRate || 0), 0) / Object.keys(employeeAttendance).length)
                      : 0}%
                  </p>
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">Average attendance rate</p>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#95AAC9]" />
                  <input
                    type="text"
                    placeholder="Search employees by name, ID, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Departments</option>
                  {Array.from(new Set(employees.map(e => e.department))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Roles</option>
                  {Array.from(new Set(employees.map(e => e.role))).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-3 text-center py-12 text-[#95AAC9]">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-[#95AAC9]">No employees found</div>
            ) : (
              employees
                .filter(emp => {
                  const matchesSearch = searchQuery === '' || 
                    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    emp.employee_code?.includes(searchQuery)
                  const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter
                  const matchesRole = roleFilter === 'all' || emp.role === roleFilter
                  return matchesSearch && matchesDept && matchesRole
                })
                .map((employee, index) => {
                const attendance = employeeAttendance[employee.employee_code || ''] || {}
                const attendanceRate = attendance.attendanceRate || 0
                const statusColor = attendanceRate >= 95 ? 'text-green-600' : attendanceRate >= 85 ? 'text-yellow-600' : 'text-red-600'
                const statusBg = attendanceRate >= 95 ? 'bg-green-50 dark:bg-green-900/20' : attendanceRate >= 85 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'
                
                return (
                <div
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-md`}>
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
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
                          {employee.role || 'Employee'}
                        </span>
                        {employee.employee_code && (
                          <span className="text-xs px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white rounded font-medium">
                            #{employee.employee_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {employee.department || 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Designation:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {employee.designation || 'Not Set'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Summary - This Month */}
                  <div className="mt-4 pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold uppercase tracking-wide">This Month:</div>
                    {attendance.presentDays ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700 dark:text-gray-300">Present</span>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">{attendance.presentDays} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="text-gray-700 dark:text-gray-300">Late</span>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">{attendance.lateArrivals} times</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700 dark:text-gray-300">Rate</span>
                          </div>
                          <span className={`font-bold ${statusColor}`}>{attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              attendanceRate >= 95 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                              attendanceRate >= 85 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                              'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                            style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <AlertCircle className="w-6 h-6 text-gray-400 dark:text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No data</p>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEmployee(employee)
                    }}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              )})
            )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {/* Header Section - Dark Theme with Activity Chart */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 rounded-xl p-4 sm:p-6 md:p-8 shadow-xl border border-gray-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors w-full sm:w-auto justify-center sm:justify-start"
                >
                  ← Back to List
                </button>
                <button
                  onClick={downloadAttendanceExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
                {/* Left: Employee Info */}
                <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${getAvatarColor(employees.findIndex(e => e.id === selectedEmployee.id))} rounded-full flex items-center justify-center text-white font-bold text-3xl sm:text-4xl flex-shrink-0 shadow-2xl ring-4 ring-gray-700`}>
                    {getInitials(selectedEmployee.full_name)}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{selectedEmployee.full_name}</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Employee #{selectedEmployee.employee_code || 'N/A'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📧</span>
                        <span className="text-gray-300">{selectedEmployee.email || 'No user account'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">🏢</span>
                        <span className="text-gray-300">{selectedEmployee.department || 'Default'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">💼</span>
                        <span className="text-gray-300">{selectedEmployee.designation || 'Employee'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📱</span>
                        <span className="text-gray-300">Not Set</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Weekly Activity Chart */}
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Activity</h3>
                    <div className="bg-gray-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg">
                      <span className="text-white text-xs sm:text-sm font-medium">
                        {weeklyActivity.reduce((sum, count) => sum + count, 0)} Punches
                      </span>
                    </div>
                  </div>
                  
                  {/* Weekly Chart - Only show days with data */}
                  <div className="flex items-end justify-center gap-2 sm:gap-3 h-20 sm:h-24">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                      const punchCount = weeklyActivity[index] || 0
                      
                      // Skip days with no data
                      if (punchCount === 0) return null
                      
                      const maxPunches = Math.max(...weeklyActivity, 1)
                      const height = (punchCount / maxPunches) * 100
                      
                      return (
                        <div key={`${day}-${index}`} className="flex flex-col items-center gap-1 sm:gap-1.5">
                          <div className="relative w-8 sm:w-10 flex items-end" style={{ height: '60px' }}>
                            <div 
                              className="w-full bg-gradient-to-t from-gray-600 to-gray-500 rounded-t relative group cursor-pointer hover:from-blue-600 hover:to-blue-500 transition-all"
                              style={{ height: `${Math.max(height, 25)}%` }}
                            >
                              <div className="absolute -top-6 sm:-top-7 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                {punchCount} punches
                              </div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">{day}</span>
                        </div>
                      )
                    }).filter(Boolean)}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'activity', label: 'Activity' },
                  { id: 'calendar', label: 'Calendar' },
                  { id: 'gamification', label: 'Achievements' },
                  { id: 'celebrations', label: 'Celebrations' },
                  { id: 'shift-leave', label: 'Shift & Leave' },
                  { id: 'analytics', label: 'Analytics' },
                  { id: 'security', label: 'Security' },
                  { id: 'history', label: 'History' },
                  { id: 'reports', label: 'Reports' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Hero Stats Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center">NOVEMBER 2025 ATTENDANCE</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {/* Days Present Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                      {loadingStats ? '...' : attendanceStats.presentDays}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Days</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Present</div>
                  </div>
                </div>

                {/* Attendance Rate Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-600 dark:text-green-400 mb-1 sm:mb-2">
                      {loadingStats ? '...' : employeeAttendance[selectedEmployee.employee_code || '']?.attendanceRate || 0}%
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Rate</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Attendance</div>
                  </div>
                </div>

                {/* Late Arrivals Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-600 dark:text-orange-400 mb-1 sm:mb-2">
                      {loadingStats ? '...' : attendanceStats.lateArrivals}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Late</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Arrivals</div>
                  </div>
                </div>

                {/* Total Punches Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-1 sm:mb-2">
                      {loadingStats ? '...' : attendanceStats.totalPunches}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Punches</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Total</div>
                  </div>
                </div>
                      </div>
                    </div>

                    {/* Attendance Chart */}
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#12263F] dark:text-white">Attendance Summary</h3>
                    <p className="text-xs sm:text-sm text-[#95AAC9]">Monthly attendance tracking and performance</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <button
                        onClick={() => setShowDateDropdown(!showDateDropdown)}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors text-xs sm:text-sm text-[#12263F] dark:text-white w-full sm:w-auto"
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
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm w-full sm:w-auto"
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
                  <div className="space-y-4 sm:space-y-6">
                    {/* Visual Progress Bars */}
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-[#12263F] dark:text-white font-medium">Attendance Rate</span>
                          <span className="text-green-600 font-bold">
                            {Math.round((attendanceStats.presentDays / 30) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 sm:h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((attendanceStats.presentDays / 30) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-[#12263F] dark:text-white font-medium">Punctuality Score</span>
                          <span className="text-blue-600 font-bold">
                            {attendanceStats.presentDays > 0 
                              ? Math.round(((attendanceStats.presentDays - attendanceStats.lateArrivals) / attendanceStats.presentDays) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all"
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
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
                      <div className="text-center p-2 sm:p-3 md:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{attendanceStats.presentDays}</div>
                        <div className="text-[10px] sm:text-xs text-[#95AAC9] mt-0.5 sm:mt-1">Days Worked</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{attendanceStats.lateArrivals}</div>
                        <div className="text-[10px] sm:text-xs text-[#95AAC9] mt-0.5 sm:mt-1">Late Days</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                          {attendanceStats.presentDays - attendanceStats.lateArrivals}
                        </div>
                        <div className="text-[10px] sm:text-xs text-[#95AAC9] mt-0.5 sm:mt-1">On-Time Days</div>
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
                )}

                {activeTab === 'activity' && (
                  <div>
                    {/* Recent Attendance Records */}
                    <RecentAttendanceRecords 
                      employeeCode={selectedEmployee.employee_code || ''}
                      employeeName={selectedEmployee.full_name}
                      dateRange={exportDateRange}
                      loading={loadingStats}
                    />
                  </div>
                )}

                {activeTab === 'calendar' && (
                  <CalendarTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'gamification' && (
                  <GamificationTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'celebrations' && (
                  <CelebrationsTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'shift-leave' && (
                  <ShiftLeaveTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'security' && (
                  <AuditSecurityTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}

                {activeTab === 'history' && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">History Tab</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Historical data coming soon</p>
                  </div>
                )}

                {activeTab === 'reports' && (
                  <ReportsTab 
                    employeeCode={selectedEmployee.employee_code || ''}
                    employeeName={selectedEmployee.full_name}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}

export default function PersonnelPage() {
  return (
    <ProtectedPage module="production" item="Personnel" permission="view">
      <PersonnelPageContent />
    </ProtectedPage>
  )
}
