'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/app/contexts/auth-context'
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  Download,
  ArrowLeft,
  LogOut,
  Activity,
  TrendingUp,
  AlertCircle
} from "lucide-react"

interface AttendanceLog {
  id: number
  employee_code: string
  employee_name: string
  log_date: string
  punch_direction: string
  serial_number: string
  temperature: number | null
  temperature_state: string
  device_location: string
  sync_timestamp: string
}

interface AttendanceSummary {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateArrivals: number
  earlyDepartures: number
}

interface EmployeeStatus {
  employee_code: string
  employee_name: string
  last_punch: string | null
  status: string
  punch_count: number
}

export default function AttendanceDashboard() {
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [syncMethod, setSyncMethod] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalRecords, setTotalRecords] = useState(0)
  const { userEmail, logout } = useAuth()

  // Load attendance data and setup auto-sync
  useEffect(() => {
    loadAttendanceData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAttendanceData, 30000)
    
    // Auto-sync from SmartOffice every 30 seconds
    const syncInterval = setInterval(async () => {
      try {
        await fetch('/api/sync-attendance', { method: 'POST' })
        setLastSyncTime(new Date())
        await loadAttendanceData() // Refresh data after sync
      } catch (error) {
        console.error('Auto sync error:', error)
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      clearInterval(syncInterval)
    }
  }, [dateRange, currentPage]) // Reload when date range or page changes

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (dateRange !== 'all') {
        params.append('dateRange', dateRange)
      }
      params.append('limit', String(itemsPerPage))
      params.append('offset', String((currentPage - 1) * itemsPerPage))
      
      const response = await fetch(`/api/get-attendance?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log('📊 Attendance data loaded:', result.data.summary)
          setAttendanceData(result.data)
          setTotalRecords(result.data.pagination?.totalRecords || 0)
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

        const handleManualSync = async () => {
          try {
            setIsSyncing(true)
            
            // First try manual sync (triggers office script)
            const manualResponse = await fetch('/api/manual-sync', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ syncType: 'attendance' })
            })
            const manualResult = await manualResponse.json()
            
            if (manualResult.success) {
              setSyncStatus(manualResult.message)
              setSyncMethod('Manual sync (Office script)')
              
              // Wait a moment for office sync to complete, then refresh data
              setTimeout(async () => {
                await loadAttendanceData()
                setLastSyncTime(new Date())
              }, 2000)
            } else {
              // Fallback to direct sync
              const response = await fetch('/api/sync-attendance', { method: 'POST' })
              const result = await response.json()
              
              if (result.success) {
                setLastSyncTime(new Date())
                setSyncStatus(result.message)
                setSyncMethod(result.syncMethod || 'Direct sync')
                await loadAttendanceData()
              } else {
                setSyncStatus(`Error: ${result.error}`)
                setSyncMethod('Failed')
              }
            }
          } catch (error) {
            console.error('Manual sync error:', error)
            setSyncStatus('Connection error')
            setSyncMethod('Failed')
          } finally {
            setIsSyncing(false)
          }
        }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in': return 'bg-green-100 text-green-800'
      case 'out': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in': return <UserCheck className="w-4 h-4" />
      case 'out': return <UserX className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Filter employees based on search and status
  const filteredEmployees = attendanceData?.todayStatus?.filter((employee: EmployeeStatus) => {
    const matchesSearch = employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus
    return matchesSearch && matchesStatus
  }) || []

  if (isLoading && !attendanceData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
                <p className="text-gray-600">Real-time employee attendance monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium">{userEmail}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Sync Controls */}
        <div className="mb-6 space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-5 h-5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="font-medium text-blue-900">Auto Sync</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      ON
                    </Badge>
                  </div>
                  {lastSyncTime && (
                    <span className="text-sm text-blue-700">
                      Last sync: {lastSyncTime.toLocaleTimeString()}
                    </span>
                  )}
                  {syncStatus && (
                    <span className="text-xs text-blue-600">
                      Status: {syncStatus}
                    </span>
                  )}
                  {syncMethod && (
                    <span className="text-xs text-blue-600">
                      Method: {syncMethod}
                    </span>
                  )}
                </div>
                <Button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Office Sync Setup Info */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900 mb-2">Office Sync Setup Required</h3>
                  <p className="text-sm text-amber-800 mb-3">
                    For automatic syncing from your office SmartOffice device, you need to set up the sync script on your office computer.
                  </p>
                  <div className="text-xs text-amber-700 space-y-1">
                    <p>📁 Files created: <code className="bg-amber-100 px-1 rounded">office-sync-script.js</code> and <code className="bg-amber-100 px-1 rounded">OFFICE_SYNC_SETUP.md</code></p>
                    <p>🔄 This will sync every 5 minutes automatically from your office computer to Supabase</p>
                    <p>🌐 Your dashboard will then work from anywhere without VPN or port forwarding</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Present Today</p>
                  <p className="text-3xl font-bold text-green-900">
                    {attendanceData?.summary?.present || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Currently in office</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Absent Today</p>
                  <p className="text-3xl font-bold text-red-900">
                    {attendanceData?.summary?.absent || 0}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Not checked in</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Employees</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {attendanceData?.summary?.totalEmployees || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Registered staff</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Late Arrivals</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {attendanceData?.summary?.lateArrivals || 0}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">After 9:00 AM</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Early Departures</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {attendanceData?.summary?.earlyDepartures || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Before 6:00 PM</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Attendance Board */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Live Attendance Board
              </CardTitle>
              <CardDescription>
                Current status of all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Historical Data</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last Year</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="in">Present</option>
                  <option value="out">Absent</option>
                </select>
              </div>

              {/* Employee List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No attendance data available</p>
                    <p className="text-sm">Connect SmartOffice device and sync data</p>
                  </div>
                ) : (
                  filteredEmployees.map((employee: EmployeeStatus) => (
                    <div key={employee.employee_code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {employee.employee_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.employee_name}</p>
                          <p className="text-sm text-gray-500">#{employee.employee_code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(employee.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(employee.status)}
                            <span className="capitalize">{employee.status}</span>
                          </div>
                        </Badge>
                        {employee.last_punch && (
                          <span className="text-sm text-gray-500">
                            {formatTime(employee.last_punch)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Punch Logs */}
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Attendance History
              </CardTitle>
              <CardDescription>
                Historical attendance activities from SmartOffice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pagination Info */}
              <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} records
                </span>
                <span className="text-xs text-gray-500">
                  Data from 2020 to present
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {attendanceData?.allLogs?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No attendance logs available</p>
                    <p className="text-sm">Connect SmartOffice device to see historical activity</p>
                  </div>
                ) : (
                  attendanceData?.allLogs?.map((log: AttendanceLog) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          {getStatusIcon(log.punch_direction)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{log.employee_name}</p>
                          <p className="text-sm text-gray-500">#{log.employee_code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(log.punch_direction)}>
                          <span className="capitalize">{log.punch_direction}</span>
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatTime(log.log_date)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.log_date).toLocaleDateString()} • Real SmartOffice data
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Pagination Controls */}
              {totalRecords > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(totalRecords / itemsPerPage)}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalRecords / itemsPerPage)}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
