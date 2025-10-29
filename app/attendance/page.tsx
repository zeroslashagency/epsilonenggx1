"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { Home, ChevronRight, Activity, Users, AlertCircle, UserX, UserCheck, Clock, Download, RefreshCw, Calendar, ChevronDown } from "lucide-react"
import { StatsCard } from "@/components/StatsCard"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { apiGet } from '@/app/lib/utils/api-client'
import { ZohoLayout } from '../components/zoho-ui'
import * as XLSX from 'xlsx-js-style'
import { calculateDateRange, getDateRangeLabel as getDateLabel } from '@/lib/utils/date-utils'
import { AttendanceLog, TodayAttendanceData, AllTrackData } from '@/app/types'
import { AttendancePermissions } from '@/app/lib/utils/permission-checker'
import type { PermissionModule } from '@/app/lib/utils/permission-checker'

export default function AttendancePage() {
  const auth = useAuth()
  const router = useRouter()
  
  // Permission state
  const [userPermissions, setUserPermissions] = useState<Record<string, PermissionModule> | null>(null)
  
  const [dateRange, setDateRange] = useState("today")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [todayData, setTodayData] = useState<TodayAttendanceData | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([])
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [recordsPerPage, setRecordsPerPage] = useState("all")
  const [customLimit, setCustomLimit] = useState("")
  const [showAllTrackRecords, setShowAllTrackRecords] = useState(false)
  const [allTrackData, setAllTrackData] = useState<AllTrackData | null>(null)
  const [allTrackLoading, setAllTrackLoading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [allEmployees, setAllEmployees] = useState<Array<{code: string, name: string}>>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [todayError, setTodayError] = useState<string | null>(null)
  const [allTrackError, setAllTrackError] = useState<string | null>(null)
  const [employeeError, setEmployeeError] = useState<string | null>(null)

  // Authentication guard
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/auth')
    }
  }, [auth.isAuthenticated, auth.isLoading, router])

  // Error message helper
  const getErrorMessage = (error: any): string => {
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return 'Network connection failed. Please check your internet and try again.'
    }
    if (error.status === 500) {
      return 'Server error. Please try again in a few moments.'
    }
    if (error.status === 401 || error.status === 403) {
      return 'Session expired. Please refresh the page and log in again.'
    }
    if (error.message?.includes('timeout')) {
      return 'Request timed out. Try selecting a smaller date range.'
    }
    return error.message || 'Something went wrong. Please try again.'
  }

  // Fetch TODAY's data only (independent from filters)
  const fetchTodayData = async () => {
    setTodayLoading(true)
    try {
      // Always fetch today's data only
      const { fromDate: fromDateParam, toDate: toDateParam } = calculateDateRange('today')
      
      const params = new URLSearchParams()
      params.append('fromDate', fromDateParam)
      params.append('toDate', toDateParam)
      
      
      const response = await apiGet(`/api/get-attendance?${params.toString()}`)
      if (response.success && response.data) {
        // Ensure allLogs is populated for export functionality
        const dataWithLogs = {
          ...response.data,
          allLogs: response.data.allLogs || response.data.recentLogs || []
        }
        setTodayData(dataWithLogs)
        setRecentLogs(response.data.recentLogs || [])
        setLastSyncTime(new Date())
      }
    } catch (error) {
      setTodayError(getErrorMessage(error))
    } finally {
      setTodayLoading(false)
    }
  }

  // Fetch All Track Records data separately
  const fetchAllTrackRecords = async () => {
    setAllTrackLoading(true)
    try {
      // Use centralized date calculation utility
      const { fromDate: fromDateParam, toDate: toDateParam } = calculateDateRange(dateRange, fromDate, toDate)
      
      const params = new URLSearchParams()
      params.append('fromDate', fromDateParam)
      params.append('toDate', toDateParam)
      
      // Add employee filter if specific employees selected
      if (selectedEmployees.length > 0 && selectedEmployees.length < allEmployees.length) {
        params.append('employeeCodes', selectedEmployees.join(','))
      } else {
      }
      
      const response = await apiGet(`/api/get-attendance?${params.toString()}`)
      if (response.success && response.data) {
        setAllTrackData(response.data)
      }
    } catch (error) {
      setAllTrackError(getErrorMessage(error))
    } finally {
      setAllTrackLoading(false)
    }
  }

  // Check permissions - temporarily show to all authenticated users
  // TODO: Integrate with granular permission system once it's populated
  const canViewTodaysActivity = true // AttendancePermissions.canViewTodaysActivity(userPermissions)
  const canExportExcel = true // AttendancePermissions.canExportExcel(userPermissions)
  const canExportRecords = true // AttendancePermissions.canExportRecords(userPermissions)

  // Fetch employees from API
  const fetchEmployees = async () => {
    let isMounted = true
    
    const loadEmployees = async () => {
      try {
        const data = await apiGet('/api/get-employees')
        
        if (isMounted && data.success && data.employees) {
          const employees = data.employees
            .filter((emp: any) => emp.employee_code)
            .map((emp: any) => ({
              code: emp.employee_code,
              name: emp.employee_name || `Employee ${emp.employee_code}`
            }))
          setAllEmployees(employees)
          setSelectedEmployees(employees.map((e: any) => e.code))
        }
      } catch (error) {
        if (isMounted) {
          setEmployeeError(getErrorMessage(error))
        }
      }
    }
    
    await loadEmployees()
    return () => { isMounted = false }
  }

  // Load today's data on mount
  useEffect(() => {
    fetchTodayData()
    fetchEmployees()
  }, [])

  const toggleEmployee = (employeeCode: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeCode)
        ? prev.filter(code => code !== employeeCode)
        : [...prev, employeeCode]
    )
  }

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === allEmployees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(allEmployees.map(e => e.code))
    }
  }

  const getDateRangeLabel = () => {
    return getDateLabel(dateRange)
  }

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  // Export to Excel
  const exportToExcel = async (source: 'today' | 'allTrack' = 'today') => {
    // For top section export, fetch data based on current filters first
    if (source === 'today') {
      const { fromDate: fromDateParam, toDate: toDateParam } = calculateDateRange(dateRange, fromDate, toDate)
      const params = new URLSearchParams()
      params.append('fromDate', fromDateParam)
      params.append('toDate', toDateParam)
      
      if (selectedEmployees.length > 0 && selectedEmployees.length < allEmployees.length) {
        params.append('employeeCodes', selectedEmployees.join(','))
      }
      
      const response = await apiGet(`/api/get-attendance?${params.toString()}`)
      if (!response.success || !response.data?.allLogs || response.data.allLogs.length === 0) {
        alert('No attendance data found for the selected date range and employees.')
        return
      }
      
      // Use freshly fetched data for export
      const dataSource = {
        ...response.data,
        allLogs: response.data.allLogs || []
      }
      
      const { fromDate: fromDateStr, toDate: toDateStr } = calculateDateRange(dateRange, fromDate, toDate)
      const startDate = new Date(fromDateStr)
      const endDate = new Date(toDateStr)
      
      const filteredLogs = dataSource.allLogs
      generateExcelFile(filteredLogs, startDate, endDate)
      return
    }
    
    // For bottom section, use existing allTrackData
    const dataSource = allTrackData
    
    if (!dataSource?.allLogs) {
      alert('No data to export. Please load data first.')
      return
    }
    
    // Use centralized date calculation utility
    const { fromDate: fromDateStr, toDate: toDateStr } = calculateDateRange(dateRange, fromDate, toDate)
    const startDate = new Date(fromDateStr)
    const endDate = new Date(toDateStr)
    
    // Filter logs by selected employees (if all employees selected, show all)
    const filteredLogs = dataSource.allLogs.filter((log: any) =>
      selectedEmployees.length === 0 || selectedEmployees.length === allEmployees.length || selectedEmployees.includes(log.employee_code)
    )
    
    // Check if we have any logs after filtering
    if (filteredLogs.length === 0) {
      alert('No attendance data found for the selected date range and employees.')
      return
    }
    
    // Group logs by employee
    const employeeGroups: Record<string, any[]> = {}
    filteredLogs.forEach((log: any) => {
      const empCode = log.employee_code
      const employee = allEmployees.find(e => e.code === empCode)
      const employeeName = employee?.name || `Employee ${empCode}`
      
      if (!employeeGroups[employeeName]) {
        employeeGroups[employeeName] = []
      }
      employeeGroups[employeeName].push(log)
    })
    
    const wb = XLSX.utils.book_new()
    
    // Create a sheet for each employee
    Object.entries(employeeGroups).forEach(([employeeName, logs]) => {
      // Sort logs by date
      const sortedLogs = logs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
      
      // Create sheet data
      const sheetData: any[] = []
      
      // Add employee name header
      sheetData.push([employeeName.toUpperCase()])
      sheetData.push([]) // Empty row
      
      // Find max punches in a day to determine column count
      const maxPunches = Math.max(...logs.map(log => {
        const dateStr = new Date(log.log_date).toDateString()
        const dayLogs = logs.filter(l => new Date(l.log_date).toDateString() === dateStr)
        return dayLogs.length
      }), 0)
      
      // Create header - just "Punches" without numbered columns
      sheetData.push(['Week', 'Date', 'Punches', 'Status'])
      
      // Generate ALL dates in the range
      const allDates: Date[] = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d))
      }
      
      // Group all dates by week
      const weekDateGroups: Record<string, Date[]> = {}
      allDates.forEach(date => {
        const weekNumber = getWeekNumber(date)
        const weekKey = `WEEK ${weekNumber}`
        
        if (!weekDateGroups[weekKey]) {
          weekDateGroups[weekKey] = []
        }
        weekDateGroups[weekKey].push(date)
      })
      
      // Add data for each week
      Object.entries(weekDateGroups).forEach(([weekKey, weekDates]) => {
        let isFirstDateInWeek = true
        
        weekDates.forEach(date => {
          const dateKey = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
          })
          
          // Find all logs for this date
          const dateLogs = logs.filter(log => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
          })
          
          if (dateLogs.length === 0) {
            // No logs for this date - show as absent
            sheetData.push([
              isFirstDateInWeek ? weekKey : '',
              dateKey,
              '',
              'Absent'
            ])
            isFirstDateInWeek = false
          } else {
            // Sort logs by time for this date
            const sortedDateLogs = dateLogs.sort((a, b) => 
              new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
            )
            
            // Combine all punch times in one cell
            const allPunches = sortedDateLogs.map(log => {
              const time = new Date(log.log_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })
              const direction = log.punch_direction?.toLowerCase() === 'in' ? 'in' : 'out'
              return `${time}(${direction})`
            }).join(',')
            
            sheetData.push([
              isFirstDateInWeek ? weekKey : '',
              dateKey,
              allPunches,
              sortedDateLogs.length > 0 ? 'Present' : 'Absent'
            ])
            isFirstDateInWeek = false
          }
          
          // Add Sunday separator
          if (date.getDay() === 0) { // Sunday
            sheetData.push(['SUNDAY', '', '', ''])
          }
        })
      })
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Set column widths
      ws['!cols'] = [
        { width: 15 }, // Week
        { width: 15 }, // Date
        { width: 80 }, // Punches (wide to fit all times)
        { width: 12 }  // Status
      ]
      
      // Add sheet to workbook (limit sheet name to 31 characters)
      const sheetName = employeeName.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })
    
    const fileName = `attendance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }
  
  // Helper function to generate Excel file
  const generateExcelFile = (filteredLogs: any[], startDate: Date, endDate: Date) => {
    // Group logs by employee
    const employeeGroups: Record<string, any[]> = {}
    filteredLogs.forEach((log: any) => {
      const empCode = log.employee_code
      const employee = allEmployees.find(e => e.code === empCode)
      const employeeName = employee?.name || `Employee ${empCode}`
      
      if (!employeeGroups[employeeName]) {
        employeeGroups[employeeName] = []
      }
      employeeGroups[employeeName].push(log)
    })
    
    const wb = XLSX.utils.book_new()
    
    // Create a sheet for each employee
    Object.entries(employeeGroups).forEach(([employeeName, logs]) => {
      // Sort logs by date
      const sortedLogs = logs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
      
      // Create sheet data
      const sheetData: any[] = []
      
      // Add employee name header
      sheetData.push([employeeName.toUpperCase()])
      sheetData.push([]) // Empty row
      
      // Generate ALL dates in the range
      const allDates: Date[] = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d))
      }
      
      // Step 1: Find max punches for THIS employee only
      let employeeMaxPunches = 0
      allDates.forEach(date => {
        const dateLogs = logs.filter(log => {
          const logDate = new Date(log.log_date).toDateString()
          return logDate === date.toDateString()
        })
        if (dateLogs.length > employeeMaxPunches) {
          employeeMaxPunches = dateLogs.length
        }
      })
      
      // Step 2: Create header with punch columns based on THIS employee's max
      const header = ['Date']
      for (let i = 1; i <= employeeMaxPunches; i++) {
        header.push(`Punch ${i}`)
      }
      header.push('Status')
      sheetData.push(header)
      
      // Step 3: Add data for each date with punches in separate columns
      allDates.forEach(date => {
        const dateKey = date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: '2-digit'
        })
        
        // Find all logs for this date
        const dateLogs = logs.filter(log => {
          const logDate = new Date(log.log_date).toDateString()
          return logDate === date.toDateString()
        })
        
        // Sort logs by time for this date
        const sortedDateLogs = dateLogs.sort((a, b) => 
          new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
        )
        
        // Create row starting with date
        const row = [dateKey]
        
        // Add each punch in its own column
        sortedDateLogs.forEach(log => {
          const time = new Date(log.log_date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
          const direction = log.punch_direction?.toLowerCase() === 'in' ? 'in' : 'out'
          row.push(`${time}(${direction})`)
        })
        
        // Fill remaining punch columns with empty strings (only up to employee's max)
        while (row.length < employeeMaxPunches + 1) {
          row.push('')
        }
        
        // Add status
        row.push(dateLogs.length > 0 ? 'Present' : 'Absent')
        
        sheetData.push(row)
      })
      
      // Step 6: Calculate attendance analytics
      const totalDays = allDates.length
      const dataRows = sheetData.slice(3) // Skip employee name, empty row, header
      const presentDays = dataRows.filter(row => row[row.length - 1] === 'Present').length
      const absentDays = totalDays - presentDays
      const attendancePercent = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0.00'
      
      // Calculate punch metrics
      let totalPunches = 0
      let maxPunchesInDay = 0
      let maxPunchesDate = ''
      let minPunchesInDay = Infinity
      let minPunchesDate = ''
      let oddPunchDays = 0
      
      dataRows.forEach((row, index) => {
        const status = row[row.length - 1]
        if (status === 'Present') {
          // Count non-empty punch columns
          let dayPunches = 0
          for (let i = 1; i < row.length - 1; i++) {
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
          
          // Check for odd punches (missing IN or OUT)
          if (dayPunches % 2 !== 0) {
            oddPunchDays++
          }
        }
      })
      
      const avgPunches = presentDays > 0 ? (totalPunches / presentDays).toFixed(2) : '0.00'
      const minPunchesDisplay = minPunchesInDay === Infinity ? 0 : minPunchesInDay
      
      // Step 7: Add summary section with calendar grid
      const summaryStartRowIndex = sheetData.length
      
      // Build summary rows (will be placed in columns A-B)
      const summaryRows = [
        [], // Empty row
        ['ATTENDANCE SUMMARY'], // Summary header
        ['Total Days in Period', totalDays],
        ['Present Days', presentDays],
        ['Absent Days', absentDays],
        ['Attendance %', `${attendancePercent}%`],
        [], // Empty row
        [], // Extra empty row for spacing
        ['PUNCH ANALYSIS'], // Punch analysis header
        ['Total Punches', totalPunches],
        ['Average Punches/Day', avgPunches],
        ['Highest Punches in a Day', `${maxPunchesInDay} (on ${maxPunchesDate})`],
        ['Lowest Punches in a Day', `${minPunchesDisplay} (on ${minPunchesDate})`],
        ['Days with Odd Punches', `${oddPunchDays} (missing IN/OUT)`]
      ]
      
      // Step 8: Detect if multi-month range
      const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                          'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
      const firstDate = new Date(startDate)
      const lastDate = new Date(endDate)
      
      // Calculate number of months in range
      const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                         (lastDate.getMonth() - firstDate.getMonth())
      
      // Show calendar for up to 2 months (1 week, 2 weeks, 1 month, 2 months)
      // Show monthly breakdown for 3+ months
      const isMultiMonth = monthsDiff >= 2
      
      let calendarRows: any[] = []
      let weeksNeeded = 0
      
      if (!isMultiMonth) {
        // Single month - show calendar grid
        const monthName = monthNames[firstDate.getMonth()]
        const year = firstDate.getFullYear()
        
        // Calculate calendar layout
        const firstDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
        const lastDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0)
        const daysInMonth = lastDayOfMonth.getDate()
        const startDayOfWeek = firstDayOfMonth.getDay() // 0=Sunday
        
        // Build calendar rows
        calendarRows.push(['', '', `${monthName} ${year} CALENDAR`]) // Title
        calendarRows.push(['', '', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) // Day headers
        
        // Build date grid
        let dayCounter = 1
        weeksNeeded = Math.ceil((startDayOfWeek + daysInMonth) / 7)
        
        for (let week = 0; week < weeksNeeded; week++) {
          const weekRow = ['', ''] // Empty columns A & B for summary
          
          for (let day = 0; day < 7; day++) {
            const cellIndex = week * 7 + day
            
            if (cellIndex < startDayOfWeek || dayCounter > daysInMonth) {
              weekRow.push('') // Empty cell
            } else {
              weekRow.push(dayCounter.toString())
              dayCounter++
            }
          }
          
          calendarRows.push(weekRow)
        }
      } else {
        // Multi-month - skip calendar, will add monthly breakdown instead
        calendarRows = []
      }
      
      // Merge summary and calendar rows (only for single month)
      if (!isMultiMonth) {
        const maxRows = Math.max(summaryRows.length, calendarRows.length)
        for (let i = 0; i < maxRows; i++) {
          const summaryRow = summaryRows[i] || ['', '']
          const calendarRow = calendarRows[i] || ['', '']
          
          // Merge: columns A-B from summary, empty column C for spacing, columns D-J from calendar
          const mergedRow = [
            summaryRow[0] || '',
            summaryRow[1] || '',
            '', // Empty column C for spacing between sections
            calendarRow[2] || '',
            calendarRow[3] || '',
            calendarRow[4] || '',
            calendarRow[5] || '',
            calendarRow[6] || '',
            calendarRow[7] || '',
            calendarRow[8] || ''
          ]
          
          sheetData.push(mergedRow)
        }
      } else {
        // Multi-month - just add summary rows without calendar
        summaryRows.forEach(row => {
          sheetData.push(row)
        })
        
        // Step 9: Add monthly breakdown for multi-month ranges
        sheetData.push([]) // Empty row
        sheetData.push([]) // Extra spacing
        sheetData.push(['MONTHLY BREAKDOWN']) // Header
        sheetData.push(['Month', 'Days', 'Present', 'Absent', 'Attendance %', 'Total Punches', 'Avg Punches/Day'])
        
        // Calculate stats for each month
        let monthlyStats: Record<string, any> = {}
        
        allDates.forEach(date => {
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
          
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
              days: 0,
              present: 0,
              absent: 0,
              punches: 0
            }
          }
          
          monthlyStats[monthKey].days++
          
          // Find logs for this date
          const dateLogs = logs.filter(log => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
          })
          
          if (dateLogs.length > 0) {
            monthlyStats[monthKey].present++
            monthlyStats[monthKey].punches += dateLogs.length
          } else {
            monthlyStats[monthKey].absent++
          }
        })
        
        // Add monthly rows
        Object.entries(monthlyStats).forEach(([month, stats]: [string, any]) => {
          const attendPercent = stats.days > 0 ? ((stats.present / stats.days) * 100).toFixed(2) : '0.00'
          const avgPunchesPerDay = stats.present > 0 ? (stats.punches / stats.present).toFixed(2) : '0.00'
          
          sheetData.push([
            month,
            stats.days,
            stats.present,
            stats.absent,
            `${attendPercent}%`,
            stats.punches,
            avgPunchesPerDay
          ])
        })
      }
      
      // Store calendar info for styling
      const calendarStartRow = summaryStartRowIndex + 1
      const calendarTitleRow = calendarStartRow
      const calendarHeaderRow = calendarStartRow + 1
      const calendarDataStartRow = calendarStartRow + 2
      
      // Create worksheet with styling
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Step 4: Set column widths based on THIS employee's max punches + calendar
      const colWidths = [{ width: 15 }] // Date column
      for (let i = 0; i < employeeMaxPunches; i++) {
        colWidths.push({ width: 15 }) // Each punch column
      }
      colWidths.push({ width: 12 }) // Status column
      
      // Add column widths for summary and calendar (columns beyond punch columns)
      // Only add these if we're in single-month mode with calendar
      if (!isMultiMonth) {
        colWidths.push({ width: 25 }) // Summary label column (A in summary section)
        colWidths.push({ width: 15 }) // Summary value column (B in summary section)
        colWidths.push({ width: 3 }) // Empty column C for spacing
        // Calendar columns (D-J)
        for (let i = 0; i < 7; i++) {
          colWidths.push({ width: 8 }) // Calendar day columns (narrow)
        }
      }
      
      ws['!cols'] = colWidths
      
      // Step 5: Apply styling to make sheet pretty
      const columnLetters: string[] = []
      const totalCols = employeeMaxPunches + 2 // Date + Punches + Status
      for (let i = 0; i < totalCols; i++) {
        columnLetters.push(String.fromCharCode(65 + i)) // A, B, C, D, ...
      }
      
      // Style 1: Employee name header (Row 1) - Dark blue background, white bold text
      columnLetters.forEach((col) => {
        const cellRef = `${col}1`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
            alignment: { horizontal: "center", vertical: "center" }
          }
        }
      })
      
      // Style 2: Column headers (Row 3) - Light blue background, bold text
      columnLetters.forEach((col) => {
        const cellRef = `${col}3`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "4472C4" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          }
        }
      })
      
      // Style 3: Date column (Column A) - Light gray background
      allDates.forEach((date, index) => {
        const rowNum = index + 4
        const cellRef = `A${rowNum}`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } },
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "center", vertical: "center" }
          }
        }
      })
      
      // Style 4: Sunday rows - Yellow background (all columns)
      allDates.forEach((date, index) => {
        if (date.getDay() === 0) { // Sunday
          const rowNum = index + 4
          columnLetters.forEach((col) => {
            const cellRef = `${col}${rowNum}`
            if (ws[cellRef]) {
              ws[cellRef].s = {
                fill: { patternType: "solid", fgColor: { rgb: "FFFF00" } },
                font: { bold: col === 'A', sz: 10 },
                alignment: { horizontal: "center", vertical: "center" }
              }
            }
          })
        }
      })
      
      // Style 5: Summary section styling
      const summaryStartRow = allDates.length + 5 // After all date rows + empty row
      
      // "ATTENDANCE SUMMARY" header - Green background
      if (!isMultiMonth) {
        // Single month - columns A-B only
        const summaryHeaderCols: string[] = ['A', 'B']
        summaryHeaderCols.forEach((col: string) => {
          const cellRef = `${col}${summaryStartRow}`
          if (ws[cellRef]) {
            ws[cellRef].s = {
              fill: { patternType: "solid", fgColor: { rgb: "70AD47" } },
              font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
              alignment: { horizontal: "center", vertical: "center" }
            }
          }
        })
      } else {
        // Multi-month - full width
        const cellRef = `A${summaryStartRow}`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "70AD47" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" }
          }
        }
      }
      
      // Summary metric rows (6 rows: Total Days, Present, Absent, %, empty, PUNCH ANALYSIS header)
      for (let i = 1; i <= 5; i++) {
        const rowNum = summaryStartRow + i
        // Label column (A) - Light gray
        const labelRef = `A${rowNum}`
        if (ws[labelRef]) {
          ws[labelRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "E7E6E6" } },
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "left", vertical: "center" }
          }
        }
        // Value column (B) - White background
        const valueRef = `B${rowNum}`
        if (ws[valueRef]) {
          ws[valueRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
            font: { sz: 10 },
            alignment: { horizontal: "right", vertical: "center" }
          }
        }
      }
      
      // "PUNCH ANALYSIS" header - Orange background
      const punchHeaderRow = summaryStartRow + 7 // +1 for extra spacing row
      if (!isMultiMonth) {
        const punchHeaderCols: string[] = ['A', 'B']
        punchHeaderCols.forEach((col: string) => {
          const cellRef = `${col}${punchHeaderRow}`
          if (ws[cellRef]) {
            ws[cellRef].s = {
              fill: { patternType: "solid", fgColor: { rgb: "ED7D31" } },
              font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
              alignment: { horizontal: "center", vertical: "center" }
            }
          }
        })
      } else {
        const cellRef = `A${punchHeaderRow}`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "ED7D31" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" }
          }
        }
      }
      
      // Style 6: Monthly Breakdown section (for multi-month only)
      if (isMultiMonth) {
        const monthlyBreakdownStartRow = punchHeaderRow + 7 // After punch analysis rows + spacing
        
        // Count months from sheetData
        let monthCount = 0
        for (let i = monthlyBreakdownStartRow + 2; i < sheetData.length; i++) {
          if (sheetData[i] && sheetData[i][0]) {
            monthCount++
          }
        }
        
        // "MONTHLY BREAKDOWN" header - Purple background
        const monthlyHeaderRef = `A${monthlyBreakdownStartRow}`
        if (ws[monthlyHeaderRef]) {
          ws[monthlyHeaderRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "9B59B6" } },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" }
          }
        }
        
        // Column headers - Gray background
        const monthlyColHeaderRow = monthlyBreakdownStartRow + 1
        const monthlyColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
        monthlyColumns.forEach((col) => {
          const cellRef = `${col}${monthlyColHeaderRow}`
          if (ws[cellRef]) {
            ws[cellRef].s = {
              fill: { patternType: "solid", fgColor: { rgb: "E7E6E6" } },
              font: { bold: true, sz: 10 },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            }
          }
        })
        
        // Data rows - Alternating colors
        for (let i = 0; i < monthCount; i++) {
          const rowNum = monthlyColHeaderRow + 1 + i
          const isEvenRow = i % 2 === 0
          const bgColor = isEvenRow ? "FFFFFF" : "F2F2F2"
          
          monthlyColumns.forEach((col) => {
            const cellRef = `${col}${rowNum}`
            if (ws[cellRef]) {
              ws[cellRef].s = {
                fill: { patternType: "solid", fgColor: { rgb: bgColor } },
                font: { sz: 10 },
                alignment: { horizontal: col === 'A' ? "left" : "center", vertical: "center" },
                border: {
                  top: { style: "thin", color: { rgb: "CCCCCC" } },
                  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                  left: { style: "thin", color: { rgb: "CCCCCC" } },
                  right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
              }
            }
          })
        }
      }
      
      // Style 7: Calendar section styling (only for single month)
      if (!isMultiMonth) {
        // Calendar title - Light blue background
        for (let col = 3; col < 10; col++) { // Columns D-J (skipping C for spacing)
          const cellRef = `${String.fromCharCode(65 + col)}${calendarTitleRow}`
          if (ws[cellRef]) {
            ws[cellRef].s = {
              fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } },
              font: { bold: true, sz: 11 },
              alignment: { horizontal: "center", vertical: "center" }
            }
          }
        }
        
        // Calendar day headers - Gray background
        for (let col = 3; col < 10; col++) { // Columns D-J (Sun-Sat)
          const cellRef = `${String.fromCharCode(65 + col)}${calendarHeaderRow}`
          if (ws[cellRef]) {
            ws[cellRef].s = {
              fill: { patternType: "solid", fgColor: { rgb: "E7E6E6" } },
              font: { bold: true, sz: 9 },
              alignment: { horizontal: "center", vertical: "center" }
            }
          }
        }
      }
      
      // Calendar date cells - Green for present, white for absent
      // Create a map of present dates
      const presentDatesSet = new Set<number>()
      dataRows.forEach((row) => {
        if (row[row.length - 1] === 'Present') {
          const dateStr = row[0] as string
          const dayMatch = dateStr.match(/^(\d+)/)
          if (dayMatch) {
            presentDatesSet.add(parseInt(dayMatch[1]))
          }
        }
      })
      
      // Apply styling to calendar date cells (only for single month)
      if (!isMultiMonth) {
        for (let week = 0; week < weeksNeeded; week++) {
          const rowNum = calendarDataStartRow + week
          
          for (let col = 3; col < 10; col++) { // Columns D-J (skipping C for spacing)
            const cellRef = `${String.fromCharCode(65 + col)}${rowNum}`
            if (ws[cellRef] && ws[cellRef].v) {
              const dateNum = parseInt(ws[cellRef].v as string)
              
              if (presentDatesSet.has(dateNum)) {
                // Present day - Green background, white text
                ws[cellRef].s = {
                  fill: { patternType: "solid", fgColor: { rgb: "70AD47" } },
                  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
                  alignment: { horizontal: "center", vertical: "center" }
                }
              } else {
                // Absent day - White background, gray text
                ws[cellRef].s = {
                  fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
                  font: { color: { rgb: "999999" }, sz: 10 },
                  alignment: { horizontal: "center", vertical: "center" }
                }
              }
            }
          }
        }
      }
      
      // Punch analysis metric rows (5 rows)
      for (let i = 1; i <= 5; i++) {
        const rowNum = punchHeaderRow + i
        // Label column (A) - Light gray
        const labelRef = `A${rowNum}`
        if (ws[labelRef]) {
          ws[labelRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "E7E6E6" } },
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "left", vertical: "center" }
          }
        }
        // Value column (B) - White background
        const valueRef = `B${rowNum}`
        if (ws[valueRef]) {
          ws[valueRef].s = {
            fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
            font: { sz: 10 },
            alignment: { horizontal: "right", vertical: "center" }
          }
        }
      }
      
      // Add sheet to workbook (limit sheet name to 31 characters)
      const sheetName = employeeName.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })
    
    const fileName = `attendance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const stats = (typeof todayData?.summary === 'object' && !Array.isArray(todayData?.summary)) 
    ? todayData.summary 
    : {
        totalEmployees: 47,
        present: 0,
        absent: 47,
        lateArrivals: 0,
        earlyDepartures: 0
      }

  const activePunches = recentLogs.length
  const activeUsers = new Set(recentLogs.map(log => log.employee_code)).size

  // Show loading while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!auth.isAuthenticated) {
    return null
  }

  return (
    <ZohoLayout breadcrumbs={[
      { label: 'Dashboard', href: '/' },
      { label: 'Attendance' }
    ]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">Attendance Dashboard</h1>
            <p className="text-muted-foreground text-lg">Real-time attendance data synced from office computer</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Auto-Sync Status</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[hsl(var(--success))] font-medium">
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] animate-pulse shadow-sm" />
                <span>Cloud Synced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-white to-gray-50 p-5 rounded-xl border border-gray-200 shadow-md">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Select value={dateRange} onValueChange={(value) => {
              setDateRange(value)
              // Date range only affects All Track Records section, not Today's section
            }}>
              <SelectTrigger className="w-[200px] bg-background border-border/50 font-medium shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="prev-week">Previous Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="prev-month">Previous Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="prev-quarter">Previous Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="prev-year">Previous Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Multi-Select */}
          <div className="relative">
            <button
              onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <Users className="h-4 w-4" />
              <span className="font-medium text-sm">
                {selectedEmployees.length === allEmployees.length
                  ? 'All Employees'
                  : `${selectedEmployees.length} Selected`}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {showEmployeeDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64 max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedEmployees.length === allEmployees.length}
                      onCheckedChange={toggleAllEmployees}
                    />
                    <span className="font-medium text-sm">Select All ({allEmployees.length})</span>
                  </div>
                </div>
                <div className="p-2">
                  {allEmployees.map((employee) => (
                    <div
                      key={employee.code}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded"
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(employee.code)}
                        onCheckedChange={() => toggleEmployee(employee.code)}
                      />
                      <span className="text-sm font-medium">{employee.name}</span>
                      <span className="text-xs text-gray-500">({employee.code})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {dateRange === 'custom' && (
            <>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
                placeholder="From Date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
                placeholder="To Date"
              />
              <Button 
                onClick={() => {
                  // Custom date range only affects All Track Records section
                }}
                className="gap-2 font-semibold"
              >
                Apply
              </Button>
            </>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px] bg-background border-border/50 font-medium shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="present">Present Today</SelectItem>
                <SelectItem value="absent">Absent Today</SelectItem>
                <SelectItem value="late">Late Arrivals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canExportExcel && (
          <Button 
            variant="outline" 
            className="gap-2 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-blue-200 shadow-md ml-auto"
            onClick={() => exportToExcel('today')}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Today Active Punches"
            value={activePunches}
            description="All punch activities today"
            icon={Activity}
            variant="purple"
          />
          <StatsCard
            title="Today Active Users"
            value={activeUsers}
            description="Employees who came today"
            icon={UserCheck}
            variant="green"
          />
          <StatsCard
            title="Delay Employee"
            value={stats.lateArrivals}
            description="Late arrivals today"
            icon={AlertCircle}
            variant="orange"
          />
          <StatsCard
            title="Holiday Employee"
            value={stats.absent}
            description="Not coming today"
            icon={UserX}
            variant="blue"
          />
          <StatsCard
            title="Total Employees"
            value={stats.totalEmployees}
            description="All registered employees"
            icon={Users}
            variant="indigo"
          />
        </div>

        {/* Today's Recent Activity */}
        {canViewTodaysActivity && (
          <Card className="shadow-xl border border-gray-200 overflow-hidden bg-gradient-to-br from-white to-gray-50">
            <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Today's Recent Activity</h2>
                  <p className="text-sm text-muted-foreground font-medium">Latest punch activities from today</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground font-medium">{activePunches} activities today</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 font-semibold bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200 hover:from-green-100 hover:to-green-200 shadow-md"
                  onClick={() => fetchTodayData()}
                  disabled={todayLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${todayLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {todayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900">Failed to Load Today's Data</h3>
                    <p className="text-sm text-red-700 mt-1">{todayError}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTodayError(null)
                      fetchTodayData()
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {todayLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-5">
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Loading attendance data...</p>
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-5">
                <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">No Activity Today</h3>
                  <p className="text-sm text-muted-foreground font-medium">No punch records found for today</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border/100">
                      <TableHead className="font-bold text-foreground py-4">Employee Code</TableHead>
                      <TableHead className="font-bold text-foreground">Employee Name</TableHead>
                      <TableHead className="font-bold text-foreground">Status</TableHead>
                      <TableHead className="font-bold text-foreground">Date</TableHead>
                      <TableHead className="font-bold text-foreground">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log, index) => (
                      <TableRow 
                        key={index} 
                        className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                      >
                        <TableCell className="font-semibold py-4">{log.employee_code}</TableCell>
                        <TableCell className="font-medium">{log.employee_name}</TableCell>
                        <TableCell>
                          <StatusBadge status={log.punch_direction as any} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.log_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {new Date(log.log_date).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
        )}

        {/* All Track Records */}
        <Card className="shadow-xl border border-gray-200 overflow-hidden bg-gradient-to-br from-white to-gray-50">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">All Track Records</h2>
              <Button variant="outline" className="bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200 hover:from-sky-100 hover:to-sky-200 shadow-md">
                <Calendar className="h-4 w-4 mr-2" />
                Cloud Synced
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <Select value={dateRange} onValueChange={(value) => {
                  setDateRange(value)
                }}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="prev-week">Previous Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="prev-month">Previous Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="prev-quarter">Previous Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="prev-year">Previous Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateRange === 'custom' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">From Date</label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">To Date</label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="bg-card"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Employee</label>
                {employeeError && (
                  <p className="text-xs text-red-600 mb-1">{employeeError}</p>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors bg-card"
                  >
                    <span className="text-sm">
                      {selectedEmployees.length === allEmployees.length
                        ? 'All Employees'
                        : `${selectedEmployees.length} Selected`}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {showEmployeeDropdown && (
                    <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64 max-h-96 overflow-y-auto">
                      <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedEmployees.length === allEmployees.length}
                            onCheckedChange={toggleAllEmployees}
                          />
                          <span className="font-medium text-sm">Select All ({allEmployees.length})</span>
                        </div>
                      </div>
                      <div className="p-2">
                        {allEmployees.map((employee) => (
                          <div
                            key={employee.code}
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded"
                          >
                            <Checkbox
                              checked={selectedEmployees.includes(employee.code)}
                              onCheckedChange={() => toggleEmployee(employee.code)}
                            />
                            <span className="text-sm font-medium">{employee.name}</span>
                            <span className="text-xs text-gray-500">({employee.code})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Records per page</label>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No Limit</SelectItem>
                    <SelectItem value="10">10 records</SelectItem>
                    <SelectItem value="25">25 records</SelectItem>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {recordsPerPage === 'custom' && (
                  <Input
                    type="number"
                    placeholder="Enter limit"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    className="bg-card mt-2"
                  />
                )}
              </div>
              
              <div className="flex items-end gap-2">
                {canExportRecords && (
                  <Button 
                    variant="outline"
                    className="gap-2 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-blue-200 shadow-md"
                    onClick={() => exportToExcel('allTrack')}
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                )}
                <Button 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    setShowAllTrackRecords(true)
                    fetchAllTrackRecords()
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </div>

            {allTrackError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900">Failed to Load Records</h3>
                    <p className="text-sm text-red-700 mt-1">{allTrackError}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAllTrackError(null)
                      fetchAllTrackRecords()
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {showAllTrackRecords && allTrackLoading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-5">
                <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Loading records...</p>
              </div>
            )}
            
            {showAllTrackRecords && !allTrackLoading && !allTrackError && (
              <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm bg-card">
                <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/50">
                    <TableHead className="font-bold text-foreground py-4">Employee Code</TableHead>
                    <TableHead className="font-bold text-foreground">Employee Name</TableHead>
                    <TableHead className="font-bold text-foreground">Status</TableHead>
                    <TableHead className="font-bold text-foreground">Date</TableHead>
                    <TableHead className="font-bold text-foreground">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const logs = allTrackData?.allLogs || []
                    const limit = recordsPerPage === 'all' ? logs.length : 
                                  recordsPerPage === 'custom' ? parseInt(customLimit) || logs.length :
                                  parseInt(recordsPerPage)
                    return logs.slice(0, limit).map((record: any, index: number) => (
                    <TableRow 
                      key={index} 
                      className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                    >
                      <TableCell className="font-semibold py-4">{record.employee_code}</TableCell>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>
                        <StatusBadge status={record.punch_direction} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.log_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {new Date(record.log_date).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
            )}
            
            {!showAllTrackRecords && (
              <div className="flex flex-col items-center justify-center py-20 space-y-5">
                <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">No Filters Applied</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select date range, employees, and click Apply Filters to view records
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ZohoLayout>
  )
}
