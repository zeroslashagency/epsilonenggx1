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
  BarChart3,
  Target,
  Zap,
  Settings,
  Download,
  Filter,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wrench,
  PlayCircle,
  PauseCircle,
  Award,
  TrendingDown,
  PieChart,
  FileText,
  Plus
} from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    let isMounted = true
    
    const loadData = async () => {
      try {
        if (!isMounted) return
        setError(null)
        
        const data = await apiGet('/api/admin/raw-attendance')
        
        if (!isMounted) return
        
        if (data.success) {
          const rawData = data.data || []
          const today = new Date().toISOString().split('T')[0]
          const todayData = rawData.filter((r: any) => r.date?.startsWith(today))
          const totalEmployees = new Set(rawData.map((r: any) => r.employee_id)).size
          const presentToday = new Set(todayData.filter((r: any) => r.status === 'present').map((r: any) => r.employee_id)).size
          
          setStats({
            ...stats,
            totalEmployees,
            presentToday,
            attendancePercentage: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
          })
          
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - i)
            return date.toISOString().split('T')[0]
          }).reverse()
          
          const trendData = last7Days.map(date => {
            const dayData = rawData.filter((r: any) => r.date?.startsWith(date))
            const present = new Set(dayData.filter((r: any) => r.status === 'present').map((r: any) => r.employee_id)).size
            const total = totalEmployees
            return {
              date,
              present,
              absent: total - present,
              percentage: total > 0 ? Math.round((present / total) * 100) : 0
            }
          })
          
          setAttendanceTrend(trendData)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching dashboard data:', err)
          setError('Failed to load dashboard data')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setLastUpdate(new Date())
        }
      }
    }
    
    loadData()
    
    return () => {
      isMounted = false
    }
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
      <div className="space-y-4">
        {/* Global Header Bar */}
        <div className="bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-500 dark:to-indigo-700 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-7 h-7" />
                  Production Dashboard
                </h1>
                <p className="text-blue-100 text-sm mt-1">Real-time manufacturing intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Quick search..."
                  className="pl-9 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
              
              {/* Sync Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-white font-medium">Live</span>
                <span className="text-xs text-blue-100">{lastUpdate.toLocaleTimeString()}</span>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">3</span>
              </Button>

              {/* Refresh */}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboardData}
                disabled={loading}
                className="text-white hover:bg-white/10"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <Select defaultValue="today">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-shifts">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-shifts">All Shifts</SelectItem>
                <SelectItem value="shift-a">Shift A</SelectItem>
                <SelectItem value="shift-b">Shift B</SelectItem>
                <SelectItem value="shift-c">Shift C</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-machines">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-machines">All Machines</SelectItem>
                <SelectItem value="vmc">VMC Machines</SelectItem>
                <SelectItem value="cnc">CNC Machines</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="ml-auto gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>


        {/* ROW A: KPI Strip - 6 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse border border-gray-200 dark:border-gray-700">
                  <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* KPI Card 1: Total Employees */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-blue-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <ArrowUp className="w-3 h-3" />
                    <span>+2%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalEmployees}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Employees</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                </div>
              </div>

              {/* KPI Card 2: Present Today */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-green-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <ArrowUp className="w-3 h-3" />
                    <span>{stats.attendancePercentage}%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.presentToday}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Present Today</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-600" style={{ width: `${stats.attendancePercentage}%` }}></div>
                </div>
              </div>

              {/* KPI Card 3: Active Orders */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-blue-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>—</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activeOrders}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Active Orders</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                </div>
              </div>

              {/* KPI Card 4: Machines Running */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-orange-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Factory className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{stats.utilizationRate}%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.machinesRunning}/{stats.totalMachines}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Machines Running</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600" style={{ width: `${stats.utilizationRate}%` }}></div>
                </div>
              </div>

              {/* KPI Card 5: Overall Efficiency */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-yellow-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Zap className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUp className="w-3 h-3" />
                    <span>+5%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  87%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Overall Efficiency</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-[87%] bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
                </div>
              </div>

              {/* KPI Card 6: Units Produced */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-indigo-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUp className="w-3 h-3" />
                    <span>+12%</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  1,247
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Units Today</div>
                <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-[78%] bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ROW B: Main Chart + Right Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Main Chart Area (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Production Timeline Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    Production Timeline
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Real-time production metrics</p>
                </div>
                <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                  <button className="px-6 py-2 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm shadow-sm transition-all">
                    Daily
                  </button>
                  <button className="px-6 py-2 rounded-full text-gray-600 dark:text-gray-400 font-medium text-sm hover:text-gray-900 dark:hover:text-white transition-all">
                    Weekly
                  </button>
                  <button className="px-6 py-2 rounded-full text-gray-600 dark:text-gray-400 font-medium text-sm hover:text-gray-900 dark:hover:text-white transition-all">
                    Monthly
                  </button>
                </div>
              </div>
              
              {/* Chart Placeholder */}
              <div className="h-80 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Production Chart</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Interactive visualization coming soon</p>
                </div>
              </div>
            </div>

            {/* Quick KPI Cards Below Chart */}
            <div className="grid grid-cols-4 gap-4">
              <div className="group bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-5 border border-green-200 dark:border-green-700 shadow-sm hover:shadow-green-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">TARGET</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300">1,500</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">83% achieved</div>
                <div className="mt-3 h-1.5 bg-green-200 dark:bg-green-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 dark:bg-green-500 rounded-full animate-pulse" style={{ width: '83%' }}></div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-blue-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">QUALITY</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300">98.5%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Pass rate</div>
                <div className="mt-3 h-1.5 bg-blue-200 dark:bg-blue-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse" style={{ width: '98.5%' }}></div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-5 border border-orange-200 dark:border-orange-700 shadow-sm hover:shadow-orange-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">UTILIZATION</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300">76%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Active time</div>
                <div className="mt-3 h-1.5 bg-orange-200 dark:bg-orange-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 dark:bg-orange-500 rounded-full animate-pulse" style={{ width: '76%' }}></div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl p-5 border border-pink-200 dark:border-pink-700 shadow-sm hover:shadow-pink-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Wrench className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">MAINTENANCE</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300">2</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Due soon</div>
                <div className="mt-3 h-1.5 bg-pink-200 dark:bg-pink-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-600 dark:bg-pink-500 rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Rail (1/3 width) */}
          <div className="space-y-4">
            {/* Alerts & Urgent Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">Alerts</h3>
                <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">3</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Machine VMC-3 Down</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Low Attendance</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">32% present</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Order Delayed</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">ORD-1234</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-700 dark:to-cyan-700 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 justify-start gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Order
                </Button>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 justify-start gap-2">
                  <PlayCircle className="w-4 h-4" />
                  Run Schedule
                </Button>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 justify-start gap-2">
                  <FileText className="w-4 h-4" />
                  Generate Report
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* ROW C: Tactical Widgets - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Activity / Live Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Live Activity Feed
              </h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activity.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.employee_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Operators */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-600" />
              Top Operators
            </h3>
            <div className="space-y-4">
              {[
                { name: 'John Smith', efficiency: 95, units: 156 },
                { name: 'Sarah Johnson', efficiency: 92, units: 148 },
                { name: 'Mike Davis', efficiency: 89, units: 142 },
                { name: 'Emily Brown', efficiency: 87, units: 138 }
              ].map((operator, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{operator.name}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">{operator.efficiency}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600" style={{ width: `${operator.efficiency}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{operator.units} units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Downtime Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-red-600" />
              Downtime Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { reason: 'Machine Maintenance', minutes: 85, color: 'bg-red-500' },
                { reason: 'Material Shortage', minutes: 42, color: 'bg-orange-500' },
                { reason: 'Setup Time', minutes: 28, color: 'bg-yellow-500' },
                { reason: 'Quality Issues', minutes: 15, color: 'bg-teal-500' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${item.color}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.reason}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{item.minutes}m</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ml-5">
                    <div className={`h-full ${item.color}`} style={{ width: `${(item.minutes / 170) * 100}%` }}></div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Downtime</span>
                  <span className="text-lg font-bold text-red-600">170 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW D: Production Tables */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Machine Status
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Machine</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Current Order</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Operator</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Utilization</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { machine: 'VMC-1', status: 'running', order: 'ORD-1234', operator: 'John Smith', utilization: 95 },
                  { machine: 'VMC-2', status: 'running', order: 'ORD-1235', operator: 'Sarah Johnson', utilization: 87 },
                  { machine: 'VMC-3', status: 'down', order: '—', operator: '—', utilization: 0 },
                  { machine: 'CNC-1', status: 'idle', order: '—', operator: 'Mike Davis', utilization: 15 },
                  { machine: 'CNC-2', status: 'running', order: 'ORD-1236', operator: 'Emily Brown', utilization: 92 }
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{row.machine}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'running' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        row.status === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {row.status === 'running' && <PlayCircle className="w-3 h-3" />}
                        {row.status === 'down' && <XCircle className="w-3 h-3" />}
                        {row.status === 'idle' && <PauseCircle className="w-3 h-3" />}
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{row.order}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{row.operator}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full ${row.utilization > 80 ? 'bg-green-500' : row.utilization > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${row.utilization}%` }}></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{row.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 dark:text-gray-400">Auto-Sync: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Last updated: {lastUpdate.toLocaleString()}</span>
              </div>
            </div>
            <a href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View System Logs
              <ArrowUp className="w-3 h-3 rotate-45" />
            </a>
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
