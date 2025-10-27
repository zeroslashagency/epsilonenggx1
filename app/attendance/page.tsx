"use client"

import { useState, useEffect } from 'react'
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
import * as XLSX from 'xlsx'
import { ZohoLayout } from '../components/zoho-ui'

interface AttendanceLog {
  employee_code: string
  employee_name: string
  log_date: string
  punch_direction: string
  sync_time: string
}

export default function AttendancePage() {
  const [dateRange, setDateRange] = useState("today")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([])
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [recordsPerPage, setRecordsPerPage] = useState("50")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [allEmployees, setAllEmployees] = useState<Array<{code: string, name: string}>>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)

  // Fetch attendance data
  const fetchAttendanceData = async (range: string = dateRange) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (range === 'custom' && fromDate && toDate) {
        params.append('fromDate', fromDate)
        params.append('toDate', toDate)
      } else {
        params.append('dateRange', range)
      }
      
      const response = await apiGet(`/api/get-attendance?${params.toString()}`)
      if (response.success && response.data) {
        setAttendanceData(response.data)
        setRecentLogs(response.data.recentLogs || [])
        setLastSyncTime(new Date())
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load today's data on mount
  useEffect(() => {
    fetchAttendanceData('today')
    fetchAllEmployees()
  }, [])

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch('/api/get-employees')
      const data = await response.json()
      if (data.success && data.employees) {
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
      console.error('Failed to fetch employees:', error)
    }
  }

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
    return labels[dateRange] || 'Today'
  }

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  // Export to Excel
  const exportToExcel = () => {
    if (!attendanceData?.allLogs) return
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now)
    
    switch(dateRange) {
      case 'today':
        startDate = new Date(now)
        endDate = new Date(now)
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        startDate = endDate = yesterday
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - now.getDay())
        endDate = new Date(now)
        break
      case 'prev-week':
        const prevWeekEnd = new Date(now)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - now.getDay() - 1)
        const prevWeekStart = new Date(prevWeekEnd)
        prevWeekStart.setDate(prevWeekStart.getDate() - 6)
        startDate = prevWeekStart
        endDate = prevWeekEnd
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'prev-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        endDate = new Date(now)
        break
      case 'prev-quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now)
        break
      case 'prev-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      case 'custom':
        if (fromDate && toDate) {
          startDate = new Date(fromDate)
          endDate = new Date(toDate)
        } else {
          startDate = new Date(now)
          endDate = new Date(now)
        }
        break
      default:
        startDate = new Date(now)
        endDate = new Date(now)
    }
    
    // Filter logs by selected employees
    const filteredLogs = attendanceData.allLogs.filter((log: any) =>
      selectedEmployees.length === 0 || selectedEmployees.includes(log.employee_code)
    )
    
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
    
    console.log(`✅ Exported ${Object.keys(employeeGroups).length} employee sheets`)
  }

  const stats = attendanceData?.summary || {
    totalEmployees: 47,
    present: 0,
    absent: 47,
    lateArrivals: 0,
    earlyDepartures: 0
  }

  const activePunches = recentLogs.length
  const activeUsers = attendanceData?.todayStatus?.length || 0

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
              if (value !== 'custom') fetchAttendanceData(value)
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
                onClick={() => fetchAttendanceData('custom')}
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

          <Button 
            variant="outline" 
            className="gap-2 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-blue-200 shadow-md ml-auto"
            onClick={exportToExcel}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
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
                  onClick={() => fetchAttendanceData(dateRange)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
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
                    {recentLogs.map((record, index) => (
                      <TableRow 
                        key={index} 
                        className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                      >
                        <TableCell className="font-semibold py-4">{record.employee_code}</TableCell>
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
                        <TableCell>
                          <StatusBadge status={record.punch_direction as any} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(record.log_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {new Date(record.log_date).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>

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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Records per page</label>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 records</SelectItem>
                    <SelectItem value="25">25 records</SelectItem>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="outline"
                  className="gap-2 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-blue-200 shadow-md"
                  onClick={exportToExcel}
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  onClick={() => fetchAttendanceData('custom')}
                >
                  Apply Filters
                </Button>
              </div>
            </div>

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
                  {attendanceData?.allLogs?.slice(0, parseInt(recordsPerPage)).map((record: any, index: number) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </ZohoLayout>
  )
}
