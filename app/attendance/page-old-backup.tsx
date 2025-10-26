"use client"

import { useState, useEffect } from 'react'
import { 
  ZohoLayout, 
  ZohoCard, 
  ZohoBadge, 
  ZohoButton,
  ZohoTable 
} from '../components/zoho-ui'
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  Filter,
  Download,
  Activity,
  TrendingUp,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
  Award
} from 'lucide-react'
import AttendanceChartShadcn from '../components/charts/AttendanceChartShadcn'
import { apiGet } from '@/app/lib/utils/api-client'
import TodayRecentActivity from '../components/TodayRecentActivity'
import DateRangePicker from '../components/DateRangePicker'
import * as XLSX from 'xlsx'
// Import types from DateRangePicker
interface ExportOptions {
  dateRange: {startDate: string, endDate: string, label: string}
  selectedEmployees: string[]
  exportType: 'all' | 'selected'
}

interface AttendanceLog {
  id: number
  employee_code: string
  employee_name?: string
  log_date: string
  punch_direction: string
  sync_time: string
  serial_number?: string
  temperature?: number | null
  temperature_state?: string
  created_at?: string
  synced_at?: string
  raw_json?: any
}

interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateArrivals: number
  earlyDepartures: number
  activePunches: number
  holidayEmployees: number
}

interface AnalyticsData {
  departmentStats: any[]
  genderStats: any[]
  timeDistribution: any[]
  topPerformers: any[]
  overallStats: {
    totalEmployees: number
    averageAttendanceRate: number
    onTimeRate: number
    averageCheckInTime: string
  }
}

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceLog[]>([])
  const [filteredData, setFilteredData] = useState<AttendanceLog[]>([]) // Keep empty until user applies filters
  const [todayData, setTodayData] = useState<AttendanceLog[]>([]) // Separate state for today's data
  const [loading, setLoading] = useState(false) // Start as false - only set to true when user clicks "Apply Filters"
  const [smartOfficeLoading, setSmartOfficeLoading] = useState(false)
  const [databaseLoading, setDatabaseLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [employeeList, setEmployeeList] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [showCharts, setShowCharts] = useState(false)
  // const [isConnected, setIsConnected] = useState(false) // REMOVED - not needed for cloud sync
  const [todayUniqueData, setTodayUniqueData] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Last 14 Days'
  })
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    earlyDepartures: 0,
    activePunches: 0,
    holidayEmployees: 0
  })

  useEffect(() => {
    // Only load TODAY's data on mount for "Today's Recent Activity" section
    // Do NOT load All Track Records - user must click "Apply Filters"
    fetchTodayDataOnly() // Load only today's data
    fetchAnalyticsData() // Load analytics immediately
    fetchLastSyncTime() // Get last sync time from Supabase cloud database
    fetchEmployeeCount() // Load total employee count on mount
  }, [selectedDate])

  // Auto-refresh every 30 seconds to get real-time updates for TODAY's data only
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh TODAY's data - don't touch filtered data
      fetchTodayDataOnly()
      fetchAnalyticsData()
      fetchLastSyncTime()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [recordsPerPage])

  const fetchAnalyticsData = async () => {
    try {
      // Always get the last 14 days of REAL data - no complicated offset
      const result = await apiGet(`/api/attendance-analytics?days=14`)
      
      if (result.success) {
        setAnalyticsData(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handlePeriodChange = (direction: 'prev' | 'next') => {
    // For now, just refresh the current data - keep it simple
    fetchAnalyticsData()
  }

  // NEW: Fetch only today's data for "Today's Recent Activity" section
  const fetchTodayDataOnly = async () => {
    console.log('🔄 Fetching TODAY\'s data only...')
    try {
      // Use LOCAL date, not UTC date (fixes timezone issue for IST users)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const today = `${year}-${month}-${day}`
      
      console.log('📅 Today\'s date (LOCAL):', today)
      
      // Remove limit parameter to get ALL today's data (API handles batching automatically)
      const apiUrl = `/api/get-attendance?fromDate=${today}&toDate=${today}&t=${Date.now()}`
      console.log('📡 Calling API for today:', apiUrl)
      const result = await apiGet(apiUrl)
      
      if (result.success && result.data) {
        const realLogs = result.data.allLogs || []
        console.log('📊 Fetched TODAY\'s logs:', realLogs.length)
        
        setTodayData(realLogs) // Store in separate state
        
        // Calculate REAL stats from actual data
        const uniqueEmployees = new Set(realLogs.map((log: any) => log.employee_code))
        const uniqueEmployeeCount = uniqueEmployees.size
        
        const apiSummary = result.data.summary
        const totalEmployees = apiSummary?.totalEmployees || 47
        
        console.log('📊 Stats Calculation:', {
          totalLogs: realLogs.length,
          uniqueEmployees: uniqueEmployeeCount,
          totalEmployees: totalEmployees,
          absent: totalEmployees - uniqueEmployeeCount
        })
        
        setStats({
          totalEmployees: totalEmployees,
          presentToday: uniqueEmployeeCount, // REAL count of unique employees
          absentToday: totalEmployees - uniqueEmployeeCount, // Calculate absent
          lateArrivals: apiSummary?.lateArrivals || 0,
          earlyDepartures: apiSummary?.earlyDepartures || 0,
          activePunches: realLogs.length, // REAL count of today's punches
          holidayEmployees: totalEmployees - uniqueEmployeeCount // Same as absent
        })
      }
    } catch (error) {
      console.error('❌ Error fetching today\'s data:', error)
    }
  }

  const fetchAttendanceData = async () => {
    console.log('🔄 Starting fetchAttendanceData...')
    setLoading(true)
    try {
      const apiUrl = `/api/get-attendance?dateRange=all&limit=50000&t=${Date.now()}`
      console.log('📡 Calling API:', apiUrl)
      const result = await apiGet(apiUrl)
      console.log('📦 Result:', result.success ? 'SUCCESS' : 'FAILED')
      
      if (result.success && result.data) {
        // Use 'allLogs' to get ALL records, not just 'recentLogs' (which is limited to 10)
        const realLogs = result.data.allLogs || result.data.recentLogs || []
        
        console.log('📊 Fetched logs:', realLogs.length)
        
        const uniqueLogs = realLogs.filter((log: AttendanceLog, index: number, self: AttendanceLog[]) => 
          index === self.findIndex((l: AttendanceLog) => 
            l.employee_code === log.employee_code && 
            l.log_date === log.log_date && 
            l.punch_direction === log.punch_direction
          )
        )
        
        setAttendanceData(uniqueLogs)
        setFilteredData(uniqueLogs) // Now this only happens when user applies filters
        
        const apiSummary = result.data.summary
        if (apiSummary) {
          setStats({
            totalEmployees: apiSummary.totalEmployees || 0,
            presentToday: apiSummary.present || 0,
            absentToday: apiSummary.absent || 0,
            lateArrivals: apiSummary.lateArrivals || 0,
            earlyDepartures: apiSummary.earlyDepartures || 0,
            activePunches: (() => {
              const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
              const todayLogs = uniqueLogs.filter((log: AttendanceLog) => {
                const logDate = log.log_date.substring(0, 10) // Extract YYYY-MM-DD from log_date
                return logDate === today
              })
              console.log('📊 Today Stats Debug:', {
                today,
                totalLogs: uniqueLogs.length,
                todayLogs: todayLogs.length,
                sampleTodayLog: todayLogs[0],
                sampleAllLog: uniqueLogs[0]
              })
              return todayLogs.length
            })(),
            holidayEmployees: apiSummary.absent || 0
          })
        }
        
        if (result.data.employees) {
          setEmployeeList(result.data.employees)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching attendance data:', error)
    } finally {
      console.log('✅ Setting loading to false')
      setLoading(false)
    }
  }

  const handleDateRangeChange = (range: {startDate: string, endDate: string, label: string}) => {
    console.log('📅 Date Range Changed:', {
      label: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      daysDifference: Math.ceil((new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24))
    })
    setDateRange(range)
    setFromDate(range.startDate)
    setToDate(range.endDate)
    
    // Fetch data for the new date range
    fetchAttendanceDataForRange(range.startDate, range.endDate)
  }

  const fetchAttendanceDataForRange = async (startDate: string, endDate: string) => {
    setLoading(true)
    try {
      const apiUrl = `/api/get-attendance?fromDate=${startDate}&toDate=${endDate}&limit=50000&t=${Date.now()}`
      console.log('📡 Fetching attendance for range:', { startDate, endDate, apiUrl })
      
      // Use apiGet instead of fetch to include authentication
      const result = await apiGet(apiUrl)
      
      console.log('📦 API Response:', { 
        success: result.success, 
        dataKeys: result.data ? Object.keys(result.data) : [],
        allLogsCount: result.data?.allLogs?.length || 0
      })
      
      if (result.success && result.data) {
        const realLogs = result.data.allLogs || []
        console.log('✅ Setting filtered data:', realLogs.length, 'records')
        console.log('📊 Sample log:', realLogs[0])
        console.log('📊 Date range of fetched data:', {
          first: realLogs[0]?.log_date,
          last: realLogs[realLogs.length - 1]?.log_date
        })
        setFilteredData(realLogs)
        setAttendanceData(realLogs)
        
        // Update employee list for export
        if (result.data.employees) {
          setEmployeeList(result.data.employees)
        }
        
        // Show success message if data found
        if (realLogs.length === 0) {
          console.warn('⚠️ No records found for this date range')
        }
      } else {
        console.error('❌ API call failed:', result)
      }
    } catch (error) {
      console.error('❌ Error fetching range data:', error)
      alert('Failed to fetch attendance data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = (options: ExportOptions) => {
    const exportRange = options.dateRange
    
    console.log('📊 Export Debug:', {
      selectedRange: exportRange,
      totalRecordsBeforeFilter: filteredData.length,
      recordsAfterDateFilter: filteredData.filter(log => {
        const logDate = new Date(log.log_date).toISOString().split('T')[0]
        return logDate >= exportRange.startDate && logDate <= exportRange.endDate
      }).length,
      dateRange: `${exportRange.startDate} to ${exportRange.endDate}`,
      sampleRecord: filteredData[0]
    })
    
    // Filter data by the selected date range first
    let dataToExport = filteredData.filter(log => {
      const logDate = new Date(log.log_date).toISOString().split('T')[0]
      return logDate >= exportRange.startDate && logDate <= exportRange.endDate
    })
    
    // Filter by selected employees if needed
    if (options.exportType === 'selected' && options.selectedEmployees.length > 0) {
      dataToExport = dataToExport.filter(log => 
        options.selectedEmployees.includes(log.employee_code)
      )
    }
    
    console.log('📊 Export Debug:', {
      selectedRange: exportRange,
      totalRecordsBeforeFilter: filteredData.length,
      recordsAfterDateFilter: dataToExport.length,
      dateRange: `${exportRange.startDate} to ${exportRange.endDate}`,
      sampleRecord: dataToExport[0]
    })
    
    // Validate we have data to export
    if (dataToExport.length === 0) {
      alert(`No data found for the selected date range: ${exportRange.label} (${exportRange.startDate} to ${exportRange.endDate})`)
      return
    }
    
    // Check if we have data for the full requested range
    const earliestDataDate = dataToExport.length > 0 ? 
      Math.min(...dataToExport.map(log => new Date(log.log_date).getTime())) : null
    const latestDataDate = dataToExport.length > 0 ? 
      Math.max(...dataToExport.map(log => new Date(log.log_date).getTime())) : null
    
    if (earliestDataDate && latestDataDate) {
      const requestedStart = new Date(exportRange.startDate).getTime()
      const requestedEnd = new Date(exportRange.endDate).getTime()
      const actualStart = new Date(earliestDataDate).toISOString().split('T')[0]
      const actualEnd = new Date(latestDataDate).toISOString().split('T')[0]
      
      if (earliestDataDate > requestedStart || latestDataDate < requestedEnd) {
        const message = `⚠️ INCOMPLETE DATA WARNING:\n\n` +
          `Requested: ${exportRange.startDate} to ${exportRange.endDate}\n` +
          `Available: ${actualStart} to ${actualEnd}\n\n` +
          `The SmartOffice device only has data from ${actualStart} onwards.\n` +
          `Earlier dates show as "Absent" because no fingerprint data exists.\n\n` +
          `Continue with export?`
        
        if (!confirm(message)) {
          return
        }
      }
    }
    
    // Group data by employee
    const employeeGroups: Record<string, AttendanceLog[]> = {}
    dataToExport.forEach(log => {
      const employeeName = log.employee_name || `Employee ${log.employee_code}`
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
      
      // Group by week
      const weekGroups: Record<string, AttendanceLog[]> = {}
      sortedLogs.forEach(log => {
        const date = new Date(log.log_date)
        const weekNumber = getWeekNumber(date)
        const weekKey = `WEEK ${weekNumber}`
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = []
        }
        weekGroups[weekKey].push(log)
      })
      
      // Create sheet data
      const sheetData: any[] = []
      
      // Add employee name header
      sheetData.push([employeeName.toUpperCase()])
      sheetData.push([]) // Empty row
      sheetData.push(['Week', 'Date', 'Punch Times', 'Status'])
      
      // Generate ALL dates in the range
      const startDate = new Date(exportRange.startDate)
      const endDate = new Date(exportRange.endDate)
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
            
            // Show ALL punch logs for this date - combine all times in one row
            const allTimes = sortedDateLogs.map(log => {
              const time = new Date(log.log_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })
              const direction = log.punch_direction.toLowerCase() === 'in' ? 'in' : 'out'
              return `${time}(${direction})`
            }).join(',')
            
            sheetData.push([
              isFirstDateInWeek ? weekKey : '',
              dateKey,
              allTimes,
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
      
      // Style the header
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14 },
          fill: { fgColor: { rgb: "90EE90" } },
          alignment: { horizontal: "center" }
        }
      }
      
      // Set column widths
      ws['!cols'] = [
        { width: 15 }, // Week
        { width: 15 }, // Date
        { width: 60 }, // Punch Times (wider to fit all times)
        { width: 12 }  // Status
      ]
      
      // Add sheet to workbook (limit sheet name to 31 characters)
      const sheetName = employeeName.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })
    
    const fileName = `attendance_${exportRange.startDate}_to_${exportRange.endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }
  
  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7)
  }

  // Check SmartOffice device status
  const fetchLastSyncTime = async () => {
    try {
      // Get the most recent sync_time directly from Supabase
      const supabase = (await import('@/app/lib/services/supabase-client')).getSupabaseClient()
      
      const { data, error } = await supabase
        .from('employee_raw_logs')
        .select('sync_time')
        .order('sync_time', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        console.error('❌ Failed to fetch last sync time:', error)
        return
      }
      
      if (data && data.sync_time) {
        setLastSyncTime(new Date(data.sync_time))
        console.log('🕐 Last sync time:', data.sync_time)
      }
    } catch (error) {
      console.error('❌ Failed to fetch last sync time:', error)
    }
  }

  // checkDeviceStatus function REMOVED - not needed for cloud sync

  const fetchEmployeeCount = async () => {
    try {
      // Get total employee count from employee_master table
      const supabase = (await import('@/app/lib/services/supabase-client')).getSupabaseClient()
      
      const { count, error } = await supabase
        .from('employee_master')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Failed to fetch employee count:', error)
        return
      }
      
      if (count !== null) {
        console.log('👥 Total employees:', count)
        setStats(prev => ({
          ...prev,
          totalEmployees: count
        }))
      }
    } catch (error) {
      console.error('❌ Failed to fetch employee count:', error)
    }
  }

  const handleSyncFromSmartOffice = async () => {
    setSmartOfficeLoading(true)
    try {
      console.log('🔄 Syncing from SmartOffice device to local computer...')
      
      // Call Edge Function to sync from SmartOffice device to local computer
      const response = await fetch('/api/sync-smartoffice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smartOfficeUrl: 'http://192.168.1.100', // Your SmartOffice device IP
          syncType: 'device-to-local'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ SmartOffice Sync Complete! New records fetched: ${result.newRecords}`)
        setLastSyncTime(new Date())
        // NO DASHBOARD REFRESH - data is only on local computer, not in cloud yet
      } else {
        throw new Error(result.message || 'SmartOffice sync failed')
      }
    } catch (error) {
      console.error('❌ SmartOffice sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error(`❌ SmartOffice Sync Failed: ${errorMessage}`)
    } finally {
      setSmartOfficeLoading(false)
    }
  }

  const handleSyncToDatabase = async () => {
    setDatabaseLoading(true)
    try {
      console.log('☁️ Starting database sync...')
      console.log('🌐 Calling API: /api/sync-database')
      
      // Call API to sync from local computer to Supabase cloud
      const response = await fetch('/api/sync-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: 'local-to-cloud'
        })
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('📊 Sync result:', result)
      
      if (result.success) {
        console.log(`✅ Database Sync Complete! Records synced to cloud: ${result.syncedRecords}`)
        
        // Refresh dashboard data after cloud sync - this updates the UI immediately
        await fetchAttendanceData()
        await fetchAnalyticsData()
        setLastSyncTime(new Date())
      } else {
        throw new Error(result.error || result.message || 'Database sync failed')
      }
    } catch (error) {
      console.error('❌ Database sync error:', error)
      
      // More detailed error message
      let errorMessage = 'Unknown error occurred'
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - Cannot connect to server. Please check if the server is running.'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      console.error(`❌ Database Sync Failed: ${errorMessage}`)
    } finally {
      setDatabaseLoading(false)
    }
  }


  const getStatusBadge = (direction: string) => {
    const normalizedDirection = direction?.toUpperCase()
    if (normalizedDirection === 'IN') {
      return <ZohoBadge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Check In</ZohoBadge>
    } else {
      return <ZohoBadge variant="info" icon={<XCircle className="w-3 h-3" />}>Check Out</ZohoBadge>
    }
  }

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(filteredData.length / recordsPerPage)

  const columns = [
    { 
      key: 'employee_code', 
      label: 'Employee Code',
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'employee_name', 
      label: 'Employee Name',
      render: (value: string | undefined, row: AttendanceLog) => 
        value || `Employee ${row.employee_code}`
    },
    { 
      key: 'punch_direction', 
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    { 
      key: 'date_display', 
      label: 'Date',
      render: (value: string, row: AttendanceLog) => new Date(row.log_date).toLocaleDateString()
    },
    { 
      key: 'time_display', 
      label: 'Time',
      render: (value: string, row: AttendanceLog) => new Date(row.log_date).toLocaleTimeString()
    }
  ]

  return (
    <ZohoLayout breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Attendance' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time attendance data synced from office computer</p>
          </div>
          {/* Sync Status Display */}
          <div className="flex flex-col gap-2 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Auto-Sync Status</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  Last sync: {lastSyncTime 
                    ? (() => {
                        const now = new Date()
                        const diff = Math.floor((now.getTime() - new Date(lastSyncTime).getTime()) / 1000 / 60)
                        if (diff < 1) return 'Just now'
                        if (diff < 60) return `${diff} min ago`
                        const hours = Math.floor(diff / 60)
                        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
                        const days = Math.floor(hours / 24)
                        return `${days} day${days > 1 ? 's' : ''} ago`
                      })()
                    : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Synced from Supabase cloud</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          onExport={handleExportToExcel}
          currentRange={dateRange}
          employees={employeeList.map(emp => ({
            employee_code: emp.employee_code,
            employee_name: emp.employee_name
          }))}
        />

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ZohoCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Today Active Punches</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.activePunches}</p>
                <p className="text-xs text-purple-600 mt-1">All punch activities today</p>
              </div>
              <Activity className="w-12 h-12 text-purple-400" />
            </div>
          </ZohoCard>

          <ZohoCard className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Today Active Users</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.presentToday}</p>
                <p className="text-xs text-green-600 mt-1">Employees who came today</p>
              </div>
              <UserCheck className="w-12 h-12 text-green-400" />
            </div>
          </ZohoCard>

          <ZohoCard className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Delay Employee</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{stats.lateArrivals}</p>
                <p className="text-xs text-orange-600 mt-1">Late arrivals today</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-400" />
            </div>
          </ZohoCard>

          <ZohoCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Holiday Employee</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.holidayEmployees}</p>
                <p className="text-xs text-blue-600 mt-1">Not coming today</p>
              </div>
              <UserX className="w-12 h-12 text-blue-400" />
            </div>
          </ZohoCard>

          <ZohoCard className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.totalEmployees}</p>
                <p className="text-xs text-indigo-600 mt-1">All registered employees</p>
              </div>
              <Users className="w-12 h-12 text-indigo-400" />
            </div>
          </ZohoCard>
        </div>

        {/* Analytics Section */}
        {analyticsData && showCharts && (
          <div className="grid grid-cols-1 gap-6">
            {/* Attendance Chart - Shadcn Style */}
            <AttendanceChartShadcn 
              data={analyticsData.dailyTrends} 
              totalEmployees={stats.totalEmployees}
            />
          </div>
        )}

        {/* Today's Recent Activity */}
        <ZohoCard>
          <TodayRecentActivity data={todayData} onRefresh={fetchTodayDataOnly} />
        </ZohoCard>

        {/* All Track Records */}
        <ZohoCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Track Records</h3>
              <ZohoBadge variant="info" icon={<Activity className="w-3 h-3" />}>
                Cloud Synced
              </ZohoBadge>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Records per page</label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={10}>10 records</option>
                  <option value={25}>25 records</option>
                  <option value={50}>50 records</option>
                  <option value={100}>100 records</option>
                </select>
              </div>
              <div className="flex items-end">
                <ZohoButton 
                  variant="primary" 
                  className="w-full"
                  onClick={() => {
                    fetchAttendanceData()
                    fetchAnalyticsData()
                  }}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Apply Filters'}
                </ZohoButton>
              </div>
            </div>

            {/* Table */}
            {currentRecords.length > 0 ? (
              <>
                <ZohoTable
                  data={currentRecords.map((record, index) => ({
                    ...record,
                    uniqueKey: `${record.id}-${record.employee_code}-${record.log_date}-${index}`
                  }))}
                  columns={columns}
                  keyField="uniqueKey"
                />
                
                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredData.length)} of {filteredData.length} records
                  </div>
                  <div className="flex gap-2">
                    <ZohoButton
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </ZohoButton>
                    <ZohoButton
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </ZohoButton>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {loading ? 'Loading...' : 'Select Filters and Click "Apply Filters"'}
                </h3>
                <p className="text-gray-500">
                  {loading 
                    ? 'Fetching attendance records...' 
                    : 'Choose date range and records per page, then click "Apply Filters" to view data'}
                </p>
              </div>
            )}
          </div>
        </ZohoCard>
      </div>
    </ZohoLayout>
  )
}
