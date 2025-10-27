"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '../components/zoho-ui/ZohoLayout'
import { 
  Users, 
  Calendar,
  TrendingUp,
  Factory,
  RefreshCw,
  AlertCircle,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  BarChart3
} from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  attendancePercentage: number
  activeOrders: number
  machinesRunning: number
  totalMachines: number
  utilizationRate: number
}

interface AttendanceTrend {
  date: string
  present: number
  absent: number
  percentage: number
}

interface RecentActivity {
  id: string
  employee_name: string
  action: string
  time: string
  type: 'in' | 'out'
}

export default function DashboardPage() {
  const auth = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    attendancePercentage: 0,
    activeOrders: 0,
    machinesRunning: 0,
    totalMachines: 10,
    utilizationRate: 0
  })
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null)
      
      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const attendanceResponse = await apiGet(`/api/get-attendance?fromDate=${today}&toDate=${today}`)
      
      // Fetch all employees
      const employeesResponse = await apiGet('/api/employee-master')
      
      if (attendanceResponse.success && employeesResponse.success) {
        const attendanceData = attendanceResponse.data
        const employeesData = employeesResponse.data
        
        const totalEmployees = employeesData.length
        const presentToday = attendanceData.employeeStatus?.length || 0
        const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
        
        setStats({
          totalEmployees,
          presentToday,
          attendancePercentage,
          activeOrders: 0, // TODO: Fetch from orders API
          machinesRunning: 0, // TODO: Fetch from machines API
          totalMachines: 10,
          utilizationRate: 0
        })
        
        // Set recent activity
        const recentLogs = (attendanceData.recentLogs || []).slice(0, 5).map((log: any) => ({
          id: log.id || Math.random().toString(),
          employee_name: log.employee_name,
          action: log.punch_direction === 'in' ? 'Punched In' : 'Punched Out',
          time: new Date(log.log_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          type: log.punch_direction?.toLowerCase() === 'in' ? 'in' : 'out'
        }))
        setRecentActivity(recentLogs)
        
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch attendance trend for last 7 days
  const fetchAttendanceTrend = async () => {
    try {
      const trends: AttendanceTrend[] = []
      const today = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const response = await apiGet(`/api/get-attendance?fromDate=${dateStr}&toDate=${dateStr}`)
        
        if (response.success) {
          const present = response.data.employeeStatus?.length || 0
          const total = stats.totalEmployees || 156
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0
          
          trends.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            present,
            absent: total - present,
            percentage
          })
        }
      }
      
      setAttendanceTrend(trends)
    } catch (error) {
      console.error('Error fetching attendance trend:', error)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (stats.totalEmployees > 0) {
      fetchAttendanceTrend()
    }
  }, [stats.totalEmployees])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <ZohoLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">
              Dashboard
            </h1>
            <p className="text-sm text-[#95AAC9] mt-1">
              Welcome back, User
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#95AAC9]">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null)
                  fetchDashboardData()
                }}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stat Cards - Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Employees */}
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 dark:bg-purple-700/20 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">
                      TOTAL
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {stats.totalEmployees}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Total Employees</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">Registered in system</div>
                </div>
              </div>

              {/* Present Today */}
              <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200/50 dark:border-green-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-700/20 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-10 h-10 text-green-600 dark:text-green-400" />
                    <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                      <ArrowUp className="w-3 h-3" />
                      {stats.attendancePercentage}%
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {stats.presentToday}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present Today</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {stats.attendancePercentage}% attendance rate
                  </div>
                </div>
              </div>

              {/* Active Orders */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-700/20 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                      ACTIVE
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {stats.activeOrders}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Active Orders</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">In production queue</div>
                </div>
              </div>

              {/* Machines Running */}
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200/50 dark:border-orange-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 dark:bg-orange-700/20 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Factory className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                    <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {stats.utilizationRate}%
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {stats.machinesRunning}/{stats.totalMachines}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Machines Running</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">Current utilization</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend Chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Attendance Trend
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Last 7 days attendance overview
                </p>
              </div>
            </div>

            {attendanceTrend.length > 0 ? (
              <div className="space-y-3">
                {attendanceTrend.map((day, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{day.date}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-green-600 dark:text-green-400">{day.present} present</span>
                        <span className="text-red-600 dark:text-red-400">{day.absent} absent</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{day.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${day.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mb-3 opacity-50" />
                <p>Loading attendance trend...</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Recent Activity
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Latest punch records today
                </p>
              </div>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.employee_name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {activity.action}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a
              href="/attendance"
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">View Attendance</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Full attendance records</p>
              </div>
            </a>
            <a
              href="/personnel"
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Personnel</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Manage employees</p>
              </div>
            </a>
            <a
              href="/analytics"
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              <BarChart3 className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Analytics</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">View reports</p>
              </div>
            </a>
            <a
              href="/settings"
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              <Activity className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Settings</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">System configuration</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
