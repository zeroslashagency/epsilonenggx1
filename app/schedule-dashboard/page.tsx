'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  Users,
  Package,
  Zap,
  Target,
  Activity,
  Factory,
  User
} from 'lucide-react'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { DashboardData } from '@/app/types'

// Simple interfaces for dashboard data
interface KPI {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

interface Schedule {
  id: string
  order: string
  machine: string
  startTime: string
  endTime: string
  status: 'completed' | 'in-progress' | 'pending' | 'delayed'
  priority: 'high' | 'medium' | 'low'
}

export default function ScheduleDashboardSimple() {
  const [activeSection, setActiveSection] = useState("kpis")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const { userEmail, logout } = useAuth()

  // Load dashboard data from Supabase
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Load from Supabase sync-dashboard API
        const response = await fetch('/api/sync-dashboard')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setDashboardData(result.data)

            // console.log('Dashboard data loaded:', result.data) // Commented out for performance
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [refreshKey])

  // Calculate KPIs from chart data - Enhanced with exact requirements
  const calculateKPIs = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return {
        totalBatchesProcessed: 0,
        completedOperations: 0,
        delayedBatches: 0,
        avgSetupDuration: 0,
        totalMachineHours: 0,
        totalSetupHours: 0,
        averageMachineUtilization: 0,
        scheduleEfficiency: 0,
        weekSpan: 0,
        machineCount: 0,
        operatorCount: 0,
        reportingPeriod: 'No Data',
        dataRefresh: new Date().toISOString(),
        criticalAlerts: 0,
        kpiMetrics: []
      }
    }

    const tasks = chartData.tasks
    const now = new Date()
    
    // Extract required fields from tasks
    const processedTasks = tasks.map((task: any) => ({
      machine: task.machine || 'Unknown',
      person: task.operator || 'Unknown',
      setupStart: task.setupStart || task.startTime,
      setupEnd: task.setupEnd || task.startTime,
      runStart: task.runStart || task.startTime,
      runEnd: task.runEnd || task.endTime,
      dueDate: task.dueDate || task.endTime,
      batchId: task.batchId || task.batch_id || `BATCH_${Math.random()}`,
      operationStatus: task.status || 'pending'
    }))

    // Calculate Primary Metrics
    const uniqueBatches = new Set(processedTasks.map((task: any) => task.batchId))
    const totalBatchesProcessed = Array.from(uniqueBatches).filter(batchId => {
      const batchTasks = processedTasks.filter((task: any) => task.batchId === batchId)
      return batchTasks.some((task: any) => task.operationStatus === 'complete')
    }).length

    const completedOperations = processedTasks.filter((task: any) => task.operationStatus === 'complete').length

    const delayedBatches = Array.from(uniqueBatches).filter(batchId => {
      const batchTasks = processedTasks.filter((task: any) => task.batchId === batchId)
      const hasCompleted = batchTasks.some((task: any) => task.operationStatus === 'complete')
      if (!hasCompleted) return false
      const lastTask = batchTasks[batchTasks.length - 1]
      const actualComplete = new Date(lastTask.runEnd)
      const dueDate = new Date(lastTask.dueDate)
      return actualComplete > dueDate
    }).length

    // Calculate Setup Duration in hours
    const setupDurations = processedTasks.map((task: any) => {
      const start = new Date(task.setupStart)
      const end = new Date(task.setupEnd)
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }).filter((duration: number) => duration > 0)
    
    const avgSetupDuration = setupDurations.length > 0 
      ? setupDurations.reduce((sum: number, duration: number) => sum + duration, 0) / setupDurations.length
      : 0

    // Calculate Total Machine Hours
    const machineHours = processedTasks.map((task: any) => {
      const start = new Date(task.runStart)
      const end = new Date(task.runEnd)
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }).filter((hours: number) => hours > 0)
    
    const totalMachineHours = machineHours.reduce((sum: number, hours: number) => sum + hours, 0)
    const totalSetupHours = setupDurations.reduce((sum: number, hours: number) => sum + hours, 0)

    // Calculate Machine Utilization
    const uniqueMachines = new Set(processedTasks.map((task: any) => task.machine))
    const uniqueOperators = new Set(processedTasks.map((task: any) => task.person))
    
    const taskTimes = processedTasks.map((task: any) => ({
      start: new Date(task.runStart),
      end: new Date(task.runEnd)
    }))
    
    const earliestStart = new Date(Math.min(...taskTimes.map((t: any) => t.start.getTime())))
    const latestEnd = new Date(Math.max(...taskTimes.map((t: any) => t.end.getTime())))
    const weekSpan = Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const totalAvailableHours = Math.max(1, weekSpan) * 8 * uniqueMachines.size
    const averageMachineUtilization = totalAvailableHours > 0 ? (totalMachineHours / totalAvailableHours) * 100 : 0

    // Calculate Schedule Efficiency
    const onTimeCompletions = completedOperations - delayedBatches
    const scheduleEfficiency = completedOperations > 0 ? (onTimeCompletions / completedOperations) * 100 : 0

    // Calculate Critical Alerts
    const criticalAlerts = delayedBatches + (averageMachineUtilization < 30 ? 1 : 0) + (avgSetupDuration > 4 ? 1 : 0)

    // Create KPI Metrics Array with exact structure
    const kpiMetrics = [
      {
        metricName: 'Total Batches Processed',
        value: totalBatchesProcessed,
        target: '> 0',
        status: totalBatchesProcessed > 0 ? '✅' : '❌',
        performance: getPerformanceCategory(totalBatchesProcessed, 1, 'batch')
      },
      {
        metricName: 'Completed Operations',
        value: completedOperations,
        target: completedOperations.toString(),
        status: completedOperations > 0 ? '✅' : '❌',
        performance: getPerformanceCategory(completedOperations, 1, 'operation')
      },
      {
        metricName: 'Delayed Batches',
        value: delayedBatches,
        target: '0',
        status: delayedBatches === 0 ? '✅' : '❌',
        performance: getPerformanceCategory(0, delayedBatches, 'delay')
      },
      {
        metricName: 'Avg Setup Duration',
        value: `${avgSetupDuration.toFixed(1)}h`,
        target: '< 2h',
        status: avgSetupDuration <= 2 ? '✅' : avgSetupDuration <= 4 ? '⚠️' : '❌',
        performance: getPerformanceCategory(2, avgSetupDuration, 'setup')
      },
      {
        metricName: 'Total Machine Hours',
        value: `${totalMachineHours.toFixed(1)}h`,
        target: '> 40h',
        status: totalMachineHours >= 40 ? '✅' : totalMachineHours >= 20 ? '⚠️' : '❌',
        performance: getPerformanceCategory(totalMachineHours, 40, 'hours')
      },
      {
        metricName: 'Total Setup Hours',
        value: `${totalSetupHours.toFixed(1)}h`,
        target: 'Minimize',
        status: totalSetupHours <= totalMachineHours * 0.2 ? '✅' : '⚠️',
        performance: getPerformanceCategory(totalSetupHours, totalMachineHours * 0.2, 'setup')
      },
      {
        metricName: 'Average Machine Utilization',
        value: `${averageMachineUtilization.toFixed(1)}%`,
        target: '> 60%',
        status: averageMachineUtilization >= 60 ? '✅' : averageMachineUtilization >= 30 ? '⚠️' : '❌',
        performance: getPerformanceCategory(averageMachineUtilization, 60, 'utilization')
      },
      {
        metricName: 'Schedule Efficiency',
        value: `${scheduleEfficiency.toFixed(1)}%`,
        target: '> 90%',
        status: scheduleEfficiency >= 90 ? '✅' : scheduleEfficiency >= 70 ? '⚠️' : '❌',
        performance: getPerformanceCategory(scheduleEfficiency, 90, 'efficiency')
      },
      {
        metricName: 'Week Span',
        value: `${weekSpan} days`,
        target: '≤ 7 days',
        status: weekSpan <= 7 ? '✅' : weekSpan <= 14 ? '⚠️' : '❌',
        performance: getPerformanceCategory(7, weekSpan, 'span')
      }
    ]

    return {
      totalBatchesProcessed,
      completedOperations,
      delayedBatches,
      avgSetupDuration,
      totalMachineHours,
      totalSetupHours,
      averageMachineUtilization,
      scheduleEfficiency,
      weekSpan,
      machineCount: uniqueMachines.size,
      operatorCount: uniqueOperators.size,
      reportingPeriod: `${earliestStart.toLocaleDateString()} - ${latestEnd.toLocaleDateString()}`,
      dataRefresh: new Date().toISOString(),
      criticalAlerts,
      kpiMetrics
    }
  }

  // Performance Category Helper
  const getPerformanceCategory = (actual: number, target: number, type: string) => {
    if (type === 'delay') {
      // For delays, lower is better
      return actual === 0 ? 'EXCELLENT' : actual <= 2 ? 'GOOD' : actual <= 5 ? 'FAIR' : 'POOR'
    }
    
    const percentage = (actual / target) * 100
    
    if (percentage >= 95) return 'EXCELLENT'
    if (percentage >= 80) return 'GOOD'
    if (percentage >= 60) return 'FAIR'
    return 'POOR'
  }

  // Get Performance Status
  const getPerformanceStatus = (rating: string) => {
    switch (rating) {
      case 'GOOD':
        return { icon: '✅', text: 'Good', color: 'bg-green-100 text-green-800' }
      case 'ACTIVE':
        return { icon: '⚠️', text: 'Active', color: 'bg-yellow-100 text-yellow-800' }
      case 'POOR':
        return { icon: '❌', text: 'Poor', color: 'bg-red-100 text-red-800' }
      default:
        return { icon: '❓', text: 'N/A', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // Get KPI Status
  const getKPIStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return { status: 'good', color: 'text-green-600', bg: 'bg-green-100' }
    if (value >= thresholds.warning) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-100' }
  }

  // Calculate Personnel Data
  const calculatePersonnelData = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return null
    }

    const tasks = chartData.tasks
    const uniqueOperators = new Set(tasks.map((task: any) => task.operator)).size
    
    // Calculate utilization rates
    const totalTasks = tasks.length
    const activeOperators = Math.max(1, uniqueOperators)
    const utilizationRate = Math.min(1, totalTasks / (activeOperators * 10)) // Assume 10 tasks per operator is optimal
    
    // Calculate shift performance
    const shiftPerformance = [
      {
        name: "Shift A (6AM-2PM)",
        operators: Math.max(1, Math.floor(uniqueOperators / 2)),
        utilization: utilizationRate * 0.9,
        efficiency: 0.85,
        status: utilizationRate > 0.8 ? 'excellent' : utilizationRate > 0.6 ? 'good' : 'needs_improvement'
      },
      {
        name: "Shift B (2PM-10PM)",
        operators: Math.max(1, Math.ceil(uniqueOperators / 2)),
        utilization: utilizationRate * 1.1,
        efficiency: 0.88,
        status: utilizationRate > 0.8 ? 'excellent' : utilizationRate > 0.6 ? 'good' : 'needs_improvement'
      }
    ]

    return {
      activePersonnel: activeOperators,
      newThisWeek: 0, // Real data will be calculated from actual new operators
      utilizationRate: utilizationRate,
      utilizationChange: 0, // Real change will be calculated from historical data
      efficiencyScore: utilizationRate / 100, // Use actual utilization as efficiency
      shiftPerformance,
      shiftA: {
        persons: Math.max(1, Math.floor(uniqueOperators / 2)),
        utilization: utilizationRate * 0.9,
        efficiency: utilizationRate / 100
      },
      shiftB: {
        persons: Math.max(1, Math.ceil(uniqueOperators / 2)),
        utilization: utilizationRate * 1.1,
        efficiency: utilizationRate / 100
      },
      underutilized: Math.max(0, Math.floor((1 - utilizationRate) * activeOperators)),
      optimal: Math.floor(utilizationRate * activeOperators * 0.7),
      highUtilization: Math.floor(utilizationRate * activeOperators * 0.3)
    }
  }

  // Calculate Machine Data
  const calculateMachineData = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return null
    }

    const tasks = chartData.tasks
    const uniqueMachines = new Set(tasks.map((task: any) => task.machine)).size
    
    // Calculate machine performance
    const machines = []
    for (let i = 1; i <= Math.max(10, uniqueMachines); i++) {
      const machineName = `VMC ${i}`
      const machineTasks = tasks.filter((task: any) => task.machine === machineName)
      const runHours = machineTasks.reduce((sum: number, task: any) => sum + (task.runDuration || 0), 0) / 60
      const setupHours = machineTasks.reduce((sum: number, task: any) => sum + (task.setupDuration || 90), 0) / 60
      const batches = new Set(machineTasks.map((task: any) => task.batchId)).size
      const utilization = Math.min(100, ((runHours + setupHours) / 8) * 100) // 8 hours per day
      
      machines.push({
        name: machineName,
        runHours: Math.round(runHours * 10) / 10,
        setupHours: Math.round(setupHours * 10) / 10,
        batches,
        utilization: Math.round(utilization)
      })
    }

    // Calculate overall metrics
    const avgUtilization = machines.reduce((sum: number, machine: any) => sum + machine.utilization, 0) / machines.length
    const totalRunningHours = machines.reduce((sum: number, machine: any) => sum + machine.runHours, 0)
    const activeMachines = machines.filter((machine: any) => machine.utilization > 0).length

    // Identify bottlenecks
    const bottlenecks = []
    const overusedMachines = machines.filter((machine: any) => machine.utilization >= 85)
    const underusedMachines = machines.filter((machine: any) => machine.utilization < 30)
    
    if (overusedMachines.length > 0) {
      bottlenecks.push({
        severity: 'critical',
        title: 'Machine Overutilization',
        description: `${overusedMachines.length} machine(s) running at >85% capacity`,
        recommendation: 'Consider adding more machines or redistributing workload'
      })
    }
    
    if (underusedMachines.length > 0) {
      bottlenecks.push({
        severity: 'warning',
        title: 'Underutilized Machines',
        description: `${underusedMachines.length} machine(s) running at <30% capacity`,
        recommendation: 'Optimize task distribution or consider maintenance scheduling'
      })
    }

    return {
      totalMachines: Math.max(10, uniqueMachines),
      activeMachines,
      avgUtilization: avgUtilization / 100,
      utilizationChange: 0, // Real change will be calculated from historical data
      totalRunningHours: Math.round(totalRunningHours * 10) / 10,
      maintenanceDue: 0, // Real maintenance due will be calculated from actual maintenance schedules
      machines: machines.slice(0, 10), // Show first 10 machines
      bottlenecks
    }
  }

  // Calculate Activity Data
  const calculateActivityData = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return null
    }

    const tasks = chartData.tasks
    const now = new Date()
    
    // Calculate activity metrics
    const totalActivities = tasks.length
    const completedTasks = tasks.filter((task: any) => task.status === 'completed').length
    const inProgressTasks = tasks.filter((task: any) => task.status === 'in_progress').length
    const pendingTasks = tasks.filter((task: any) => task.status === 'pending').length
    const activeNow = tasks.filter((task: any) => {
      const startTime = new Date(task.startTime)
      const endTime = new Date(task.endTime)
      return startTime <= now && endTime >= now
    }).length

    // Calculate completion rate
    const completionRate = totalActivities > 0 ? Math.round((completedTasks / totalActivities) * 100) : 0
    
    // Calculate average progress time
    const avgProgressTime = inProgressTasks > 0 
      ? Math.round(tasks.filter((task: any) => task.status === 'in_progress')
          .reduce((sum: number, task: any) => sum + (task.duration || 0), 0) / inProgressTasks / 60)
      : 0

    // Generate heatmap data based on actual task data (7 days x 2 shifts)
    const heatmap = []
    const taskDates = tasks.map((task: any) => new Date(task.startTime).getDay())
    
    for (let day = 0; day < 7; day++) {
      for (let shift = 0; shift < 2; shift++) {
        // Count actual tasks for this day
        const dayTasks = taskDates.filter((taskDay: number) => taskDay === day).length
        const activities = Math.floor(dayTasks / 2) // Split between day/night shift
        heatmap.push({
          day,
          shift: shift === 0 ? 'Day' : 'Night',
          activities,
          intensity: activities === 0 ? 0 : activities <= 1 ? 1 : activities <= 2 ? 2 : activities <= 3 ? 3 : 4
        })
      }
    }

    // Generate recent activities from actual task data
    const recentActivities = tasks.slice(0, 5).map((task: any, index: number) => ({
      task: `${task.partNumber || task.part_number || 'Unknown'} - ${task.operationName || task.operation_name || 'Operation'}`,
      machine: task.machine || 'Unknown',
      operator: task.operator || 'Unknown',
      duration: `${Math.round((task.duration || 0) / 60)}h`,
      status: task.status || 'pending',
      time: new Date(task.startTime || task.start_time || Date.now()).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }))

    return {
      totalActivities,
      completedToday: completedTasks,
      completionRate,
      inProgress: inProgressTasks,
      pending: pendingTasks,
      activeNow,
      avgProgressTime,
      heatmap,
      recentActivities
    }
  }

  // Calculate Alert Data
  const calculateAlertData = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return null
    }

    const tasks = chartData.tasks
    const now = new Date()
    
    // Generate alerts based on task data
    const alerts = []
    
    // Check for delayed tasks
    const delayedTasks = tasks.filter((task: any) => {
      const dueDate = new Date(task.endTime)
      return dueDate < now && task.status !== 'completed'
    })
    
    if (delayedTasks.length > 0) {
      alerts.push({
        severity: 'critical',
        title: 'Delayed Tasks Detected',
        description: `${delayedTasks.length} task(s) are behind schedule`,
        source: 'Scheduler',
        time: '2 minutes ago'
      })
    }
    
    // Check for machine utilization issues
    const uniqueMachines = new Set(tasks.map((task: any) => task.machine)).size
    const avgUtilization = tasks.length / (uniqueMachines * 10) // Rough calculation
    
    if (avgUtilization > 0.9) {
      alerts.push({
        severity: 'warning',
        title: 'High Machine Utilization',
        description: 'Some machines are running at >90% capacity',
        source: 'Machine Monitor',
        time: '15 minutes ago'
      })
    }
    
    if (avgUtilization < 0.3) {
      alerts.push({
        severity: 'info',
        title: 'Low Machine Utilization',
        description: 'Consider optimizing task distribution',
        source: 'Analytics',
        time: '1 hour ago'
      })
    }
    
    // Check for operator issues
    const uniqueOperators = new Set(tasks.map((task: any) => task.operator)).size
    if (uniqueOperators < tasks.length / 5) {
      alerts.push({
        severity: 'warning',
        title: 'Operator Overload',
        description: 'Some operators have too many tasks assigned',
        source: 'Personnel Manager',
        time: '30 minutes ago'
      })
    }

    const critical = alerts.filter((alert: any) => alert.severity === 'critical').length
    const warnings = alerts.filter((alert: any) => alert.severity === 'warning').length
    const info = alerts.filter((alert: any) => alert.severity === 'info').length
    const resolved = 0 // Real resolved count will be calculated from actual resolved alerts

    return {
      critical,
      warnings,
      info,
      resolved,
      activeAlerts: alerts
    }
  }

  // Calculate Analytics Data
  const calculateAnalyticsData = (chartData: any) => {
    if (!chartData || !chartData.tasks || chartData.tasks.length === 0) {
      return null
    }

    const tasks = chartData.tasks
    
    // Calculate efficiency score based on completion rate and utilization
    const completedTasks = tasks.filter((task: any) => task.status === 'completed').length
    const efficiencyScore = completedTasks / tasks.length
    
    // Calculate throughput (parts per hour)
    const totalHours = tasks.reduce((sum: number, task: any) => sum + (task.duration || 0), 0) / (60 * 60 * 1000)
    const throughput = totalHours > 0 ? Math.round(tasks.length / totalHours) : 0
    
    // Calculate quality rate based on actual completion rate
    const qualityRate = efficiencyScore // Use actual efficiency as quality rate
    
    // Calculate cost per unit based on actual machine hours
    const costPerUnit = totalHours > 0 ? (totalHours * 50) / tasks.length : 0 // $50/hour rate
    
    // Calculate week-over-week change (placeholder for real historical data)
    const weekOverWeek = 0 // Real change will be calculated from historical data
    
    // Calculate moving average based on actual efficiency
    const movingAverage = efficiencyScore * 100 // Use actual efficiency
    
    // Calculate predictive score based on current performance
    const predictiveScore = Math.round(efficiencyScore * 100) // Use actual efficiency score
    
    // Determine trend direction
    const trendDirection = weekOverWeek > 0 ? 'up' : 'down'
    
    // Calculate resource utilization
    const uniqueMachines = new Set(tasks.map((task: any) => task.machine)).size
    const uniqueOperators = new Set(tasks.map((task: any) => task.operator)).size
    const machineUtilization = Math.min(100, (tasks.length / (uniqueMachines * 10)) * 100)
    const personnelUtilization = Math.min(100, (tasks.length / (uniqueOperators * 8)) * 100)

    return {
      efficiencyScore,
      throughput,
      qualityRate,
      costPerUnit: Math.round(costPerUnit * 10) / 10,
      weekOverWeek: Math.round(weekOverWeek * 10) / 10,
      movingAverage: Math.round(movingAverage),
      predictiveScore,
      trendDirection,
      resourceUtilization: {
        machines: Math.round(machineUtilization),
        personnel: Math.round(personnelUtilization)
      }
    }
  }

  const handleGoToMainDashboard = () => {
    window.location.href = '/'
  }

  const handleGoToScheduler = () => {
    window.location.href = '/scheduler'
  }

  const handleGoToChart = () => {
    window.location.href = '/chart'
  }

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  const sidebarItems = [
    { id: "kpis", label: "KPIs", icon: Target },
    { id: "personnel", label: "Personnel", icon: Users },
    { id: "machines", label: "Machines", icon: Factory },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "alerts", label: "Alerts", icon: AlertCircle },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  // Memoize expensive calculations to prevent re-running on every render
  const memoizedCalculations = useMemo(() => {
    if (!dashboardData?.chartData) {
      return {
        kpis: null,
        personnelData: null,
        machineData: null,
        activityData: null,
        alertData: null,
        analyticsData: null
      }
    }

    return {
      kpis: calculateKPIs(dashboardData.chartData),
      personnelData: calculatePersonnelData(dashboardData.chartData),
      machineData: calculateMachineData(dashboardData.chartData),
      activityData: calculateActivityData(dashboardData.chartData),
      alertData: calculateAlertData(dashboardData.chartData),
      analyticsData: calculateAnalyticsData(dashboardData.chartData)
    }
  }, [dashboardData?.chartData])

  const renderContent = () => {
    switch (activeSection) {
      case "kpis":
        const kpis = memoizedCalculations.kpis
        
        return (
          <div className="space-y-6">
            {/* Executive KPI Metrics Panel */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="w-6 h-6 text-blue-600" />
                  Executive KPI Metrics Panel
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Real-time performance indicators with advanced calculation engine
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading KPI data...</p>
                  </div>
                ) : !dashboardData || !dashboardData.chartData || !dashboardData.chartData.tasks || dashboardData.chartData.tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-6">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                      <p className="text-gray-600 mb-4">No scheduling data found. Please import your Excel file in the Chart section first.</p>
                      <Button 
                        onClick={() => window.location.href = '/chart'}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Go to Chart Section
                      </Button>
                    </div>
                  </div>
                ) : kpis ? (
                  <div className="space-y-6">

                    {/* Key Metrics Grid (2x2 Layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Card 1 - Batch Processing */}
                      <Card className={`${kpis.totalBatchesProcessed === 0 ? 'bg-gray-50 border-red-200' : 'bg-green-50 border-green-200'} shadow-lg`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Factory className={`w-8 h-8 ${kpis.totalBatchesProcessed === 0 ? 'text-red-500' : 'text-green-500'}`} />
                            <Badge className={`${kpis.totalBatchesProcessed === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {kpis.totalBatchesProcessed === 0 ? 'POOR' : 'GOOD'}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Batches Processed</h3>
                          <div className={`text-4xl font-bold mb-2 ${kpis.totalBatchesProcessed === 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {kpis.totalBatchesProcessed}
                          </div>
                          <p className="text-sm text-gray-600">
                            {kpis.totalBatchesProcessed === 0 ? 'No active batches' : 'Active production'}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Card 2 - Machine Utilization */}
                      <Card className={`${kpis.averageMachineUtilization >= 60 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} shadow-lg`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Gauge className={`w-8 h-8 ${kpis.averageMachineUtilization >= 60 ? 'text-green-500' : 'text-yellow-500'}`} />
                            <Badge className={`${kpis.averageMachineUtilization >= 60 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {kpis.averageMachineUtilization >= 60 ? 'EXCELLENT' : 'WARNING'}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Efficiency</h3>
                          <div className={`text-4xl font-bold mb-2 ${kpis.averageMachineUtilization >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {kpis.averageMachineUtilization.toFixed(1)}%
                          </div>
                          <p className="text-sm text-gray-600">
                            {kpis.averageMachineUtilization >= 60 ? 'Above target performance' : 'Below target'}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Card 3 - Schedule Performance */}
                      <Card className={`${kpis.scheduleEfficiency >= 90 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} shadow-lg`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Clock className={`w-8 h-8 ${kpis.scheduleEfficiency >= 90 ? 'text-green-500' : 'text-red-500'}`} />
                            <Badge className={`${kpis.scheduleEfficiency >= 90 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {kpis.scheduleEfficiency >= 90 ? 'EXCELLENT' : 'POOR'}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Efficiency</h3>
                          <div className={`text-4xl font-bold mb-2 ${kpis.scheduleEfficiency >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                            {kpis.scheduleEfficiency.toFixed(1)}%
                          </div>
                          <p className="text-sm text-gray-600">
                            {kpis.scheduleEfficiency >= 90 ? 'On-time performance' : 'Needs immediate attention'}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Card 4 - Setup Operations */}
                      <Card className={`${kpis.avgSetupDuration <= 2 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} shadow-lg`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Timer className={`w-8 h-8 ${kpis.avgSetupDuration <= 2 ? 'text-blue-500' : 'text-orange-500'}`} />
                            <Badge className={`${kpis.avgSetupDuration <= 2 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                              {kpis.avgSetupDuration <= 2 ? 'EXCELLENT' : 'WARNING'}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Setup Time</h3>
                          <div className={`text-4xl font-bold mb-2 ${kpis.avgSetupDuration <= 2 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {kpis.avgSetupDuration.toFixed(1)}h
                          </div>
                          <p className="text-sm text-gray-600">
                            {kpis.avgSetupDuration <= 2 ? 'Under 2h target' : 'Above 2h target'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visual Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Chart - Machine Hours Trend */}
                      <Card className="bg-white border border-gray-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-600" />
                            Machine Hours Trend
                          </CardTitle>
                          <CardDescription>Daily machine hours over the last 14 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64 flex items-end justify-between gap-2">
                            {Array.from({ length: 14 }, (_, i) => {
                              // Calculate actual machine hours for each day based on task data
                              const dayStart = new Date()
                              dayStart.setDate(dayStart.getDate() - (13 - i))
                              dayStart.setHours(0, 0, 0, 0)
                              
                              const dayEnd = new Date(dayStart)
                              dayEnd.setHours(23, 59, 59, 999)
                              
                              const chartTasks = dashboardData?.chartData?.tasks || []
                              const dayTasks = chartTasks.filter((task: any) => {
                                const taskDate = new Date(task.startTime)
                                return taskDate >= dayStart && taskDate <= dayEnd
                              })
                              
                              const dayHours = dayTasks.reduce((sum: number, task: any) => {
                                return sum + ((task.duration || 0) / (60 * 60 * 1000))
                              }, 0)
                              
                              const height = Math.min((dayHours / 24) * 100, 100) // Max 100% height
                              return (
                                <div key={i} className="flex flex-col items-center gap-2">
                                  <div 
                                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-8 transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                                    style={{ height: `${height}%` }}
                                    title={`Day ${i + 1}: ${dayHours.toFixed(1)}h`}
                                  ></div>
                                  <span className="text-xs text-gray-500">{i + 1}</span>
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-4 text-center text-sm text-gray-600">
                            Peak: {(() => {
                              let maxHours = 0
                              let peakDay = 1
                              for (let i = 0; i < 14; i++) {
                                const dayStart = new Date()
                                dayStart.setDate(dayStart.getDate() - (13 - i))
                                dayStart.setHours(0, 0, 0, 0)
                                
                                const dayEnd = new Date(dayStart)
                                dayEnd.setHours(23, 59, 59, 999)
                                
                                const chartTasks = dashboardData?.chartData?.tasks || []
                                const dayTasks = chartTasks.filter((task: any) => {
                                  const taskDate = new Date(task.startTime)
                                  return taskDate >= dayStart && taskDate <= dayEnd
                                })
                                
                                const dayHours = dayTasks.reduce((sum: number, task: any) => {
                                  return sum + ((task.duration || 0) / (60 * 60 * 1000))
                                }, 0)
                                
                                if (dayHours > maxHours) {
                                  maxHours = dayHours
                                  peakDay = i + 1
                                }
                              }
                              return `${maxHours.toFixed(1)}h on Day ${peakDay}`
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Right Chart - Utilization Breakdown */}
                      <Card className="bg-white border border-gray-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-green-600" />
                            Utilization Breakdown
                          </CardTitle>
                          <CardDescription>Machine utilization categories</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center h-64">
                            <div className="relative w-48 h-48">
                              {/* Donut Chart */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Active */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#22c55e"
                                  strokeWidth="8"
                                  strokeDasharray={`${kpis.averageMachineUtilization * 2.51} 251`}
                                  strokeLinecap="round"
                                />
                                {/* Setup */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="8"
                                  strokeDasharray={`${(kpis.avgSetupDuration * 10)} 251`}
                                  strokeDashoffset={`-${kpis.averageMachineUtilization * 2.51}`}
                                  strokeLinecap="round"
                                />
                                {/* Idle */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#6b7280"
                                  strokeWidth="8"
                                  strokeDasharray={`${251 - (kpis.averageMachineUtilization * 2.51) - (kpis.avgSetupDuration * 10)} 251`}
                                  strokeDashoffset={`-${kpis.averageMachineUtilization * 2.51 + (kpis.avgSetupDuration * 10)}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-900">{kpis.averageMachineUtilization.toFixed(1)}%</div>
                                  <div className="text-sm text-gray-600">Avg Utilization</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Setup</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Idle</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Performance Indicators Panel */}
                    <Card className="bg-white border border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-indigo-600" />
                          Performance Indicators
                        </CardTitle>
                        <CardDescription>Key performance metrics and alerts</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-2">
                              {kpis.delayedBatches === 0 ? (
                                <CheckCircle className="w-8 h-8 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{kpis.delayedBatches}</div>
                            <div className="text-sm text-gray-600">Delayed Batches</div>
                          </div>

                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-2">
                              {kpis.weekSpan <= 7 ? (
                                <CheckCircle className="w-8 h-8 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{kpis.weekSpan} days</div>
                            <div className="text-sm text-gray-600">Week Span</div>
                          </div>

                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-2">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {kpis.totalBatchesProcessed === 0 ? 'Idle' : 'Active'}
                            </div>
                            <div className="text-sm text-gray-600">Operations Status</div>
                          </div>

                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900 mb-2">
                              {Math.round((kpis.totalMachineHours / 40) * 100)}%
                            </div>
                            <Progress value={(kpis.totalMachineHours / 40) * 100} className="mb-2" />
                            <div className="text-sm text-gray-600">Target Achievement</div>
                          </div>
                        </div>

                        {/* Alert Section */}
                        <div className="space-y-4">
                          {kpis.totalBatchesProcessed === 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-red-900">Critical Issues</span>
                              </div>
                              <p className="text-red-800">No Active Batches - Production system is idle</p>
                            </div>
                          )}
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-blue-500" />
                              <span className="font-semibold text-blue-900">Recommendations</span>
                            </div>
                            <p className="text-blue-800">
                              {kpis.totalBatchesProcessed === 0 ? 'Schedule new production runs' : 'Continue current production schedule'}
                            </p>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-5 h-5 text-gray-500" />
                              <span className="font-semibold text-gray-900">Next Action</span>
                            </div>
                            <p className="text-gray-800">
                              {kpis.totalBatchesProcessed === 0 ? 'Initialize batch processing system' : 'Monitor ongoing operations'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bottom Summary Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-white border border-gray-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                            Quick Stats Grid
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Total Operations</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{kpis.completedOperations}</span>
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Peak Utilization</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{kpis.averageMachineUtilization.toFixed(1)}%</span>
                                <Clock className="w-4 h-4 text-blue-500" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Efficiency Rating</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <div key={star} className={`w-4 h-4 ${star <= (kpis.scheduleEfficiency / 20) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    ★
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Weekly Target</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">40h vs {kpis.totalMachineHours.toFixed(1)}h</span>
                                <span className={`text-sm ${kpis.totalMachineHours >= 40 ? 'text-green-600' : 'text-red-600'}`}>
                                  {kpis.totalMachineHours >= 40 ? 'achieved' : 'below target'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white border border-gray-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-orange-600" />
                            Action Items
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-gray-900">Priority 1: {kpis.totalBatchesProcessed === 0 ? 'Start batch processing' : 'Monitor batch completion'}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-gray-900">Priority 2: {kpis.scheduleEfficiency < 90 ? 'Optimize schedule efficiency' : 'Maintain schedule efficiency'}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-gray-900">Priority 3: {kpis.averageMachineUtilization < 60 ? 'Review utilization calculations' : 'Maintain utilization levels'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600 mb-4">Generate a schedule first to see KPI metrics</p>
                    <Button onClick={handleGoToScheduler} className="bg-blue-600 text-white hover:bg-blue-700">
                      <Cog className="w-4 h-4 mr-2" />
                      Go to Schedule Generator
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      case "personnel":
        const personnelData = memoizedCalculations.personnelData
        
        return (
          <div className="space-y-6">
            {/* Personnel Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Personnel */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Active Personnel</p>
                      <p className="text-3xl font-bold text-blue-900">{personnelData?.activePersonnel || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">+{personnelData?.newThisWeek || 0} this week</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Utilization Rate */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Utilization Rate</p>
                      <p className="text-3xl font-bold text-green-900">{Math.round((personnelData?.utilizationRate || 0) * 100)}%</p>
                      <p className="text-xs text-green-600 mt-1">+{(personnelData?.utilizationChange || 0).toFixed(1)}% from last week</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency Score */}
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 mb-1">Efficiency Score</p>
                      <p className="text-3xl font-bold text-purple-900">{Math.round((personnelData?.efficiencyScore || 0) * 100)}%</p>
                      <p className="text-xs text-purple-600 mt-1">Excellent performance</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personnel Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-600" />
                    Personnel Performance
                  </CardTitle>
                  <CardDescription>Weekly performance trends and efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {personnelData ? (
                    <div className="space-y-4">
                      {personnelData.shiftPerformance.map((shift: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{shift.name}</span>
                            <Badge className={`${shift.status === 'excellent' ? 'bg-green-100 text-green-800' : shift.status === 'good' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {shift.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Operators:</span>
                              <span className="font-medium ml-1">{shift.operators}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Utilization:</span>
                              <span className="font-medium ml-1">{Math.round(shift.utilization * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Efficiency:</span>
                              <span className="font-medium ml-1">{Math.round(shift.efficiency * 100)}%</span>
                            </div>
                          </div>
                          <Progress value={shift.utilization * 100} className="mt-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Personnel Data</h3>
                      <p className="text-gray-600">Generate a schedule to see personnel analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-green-600" />
                    Shift Distribution
                  </CardTitle>
                  <CardDescription>Personnel allocation across shifts</CardDescription>
                </CardHeader>
                <CardContent>
                  {personnelData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{personnelData.shiftA.persons}</div>
                          <div className="text-sm text-gray-600">Shift A</div>
                          <div className="text-xs text-blue-600 mt-1">{Math.round(personnelData.shiftA.utilization)}% utilized</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{personnelData.shiftB.persons}</div>
                          <div className="text-sm text-gray-600">Shift B</div>
                          <div className="text-xs text-green-600 mt-1">{Math.round(personnelData.shiftB.utilization)}% utilized</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Underutilized Personnel</span>
                          <Badge className="bg-red-100 text-red-800">{personnelData.underutilized}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Optimal Utilization</span>
                          <Badge className="bg-green-100 text-green-800">{personnelData.optimal}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">High Utilization</span>
                          <Badge className="bg-yellow-100 text-yellow-800">{personnelData.highUtilization}</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Shift Data</h3>
                      <p className="text-gray-600">Personnel shift data will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "machines":
        const machineData = memoizedCalculations.machineData
        
        return (
          <div className="space-y-6">
            {/* Header & Navigation Section */}
            <div className="bg-white text-gray-900 rounded-lg p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-900">MACHINES</h1>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">System Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-50">
                    Export
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-600">Main Dashboard</span>
                <span className="text-gray-600">Schedule Generator</span>
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>

            {/* Hero Metrics Cards (Top Row - 4 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Card 1 - Total Machines */}
              <Card className="bg-white text-gray-900 border border-gray-200 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Factory className="w-6 h-6 text-blue-600" />
                        <span className="text-sm text-gray-600">Total Machines</span>
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-1">{machineData?.totalMachines || 10}</div>
                      <div className="text-sm text-gray-500">{machineData?.activeMachines || 0} active</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 text-sm">+0</div>
                      <TrendingUp className="w-4 h-4 text-green-600 ml-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 - Avg Utilization */}
              <Card className="bg-white text-gray-900 border border-gray-200 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-6 h-6 text-blue-600" />
                        <span className="text-sm text-gray-600">Avg Utilization</span>
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-1">{Math.round((machineData?.avgUtilization || 0) * 100)}%</div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 text-xs mb-1">+8.6% this week</Badge>
                      <TrendingUp className="w-4 h-4 text-green-600 ml-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 - Running Hours */}
              <Card className="bg-white text-gray-900 border border-gray-200 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        <span className="text-sm text-gray-600">Running Hours</span>
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-1">{machineData?.totalRunningHours || 0}h</div>
                      <div className="text-sm text-gray-500">Today</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-600 text-sm">+2h</div>
                      <TrendingUp className="w-4 h-4 text-blue-600 ml-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 - Maintenance Due */}
              <Card className="bg-white text-gray-900 border border-gray-200 shadow-xl border-l-4 border-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <span className="text-sm text-gray-600">Maintenance Due</span>
                      </div>
                      <div className="text-4xl font-bold text-orange-600 mb-1">{machineData?.maintenanceDue || 1}</div>
                      <div className="text-sm text-orange-500">This week</div>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-600 text-sm">Urgent</div>
                      <AlertTriangle className="w-4 h-4 text-orange-600 ml-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Real-time Performance Line Chart */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="w-5 h-5 text-blue-600" />
                      Machine Performance Today
                    </CardTitle>
                    <CardDescription>Real-time utilization and performance metrics</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 relative">
                  {/* Simulated line chart */}
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    {/* VMC Utilization Line (Green) */}
                    <polyline
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      points="0,180 50,160 100,140 150,120 200,100 250,80 300,90 350,70 400,60"
                    />
                    {/* Setup Time Line (Yellow) */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      points="0,190 50,185 100,175 150,170 200,165 250,160 300,155 350,150 400,145"
                    />
                    {/* Production Output Line (Blue) */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points="0,200 50,180 100,160 150,140 200,120 250,100 300,110 350,90 400,80"
                    />
                  </svg>
                  <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 rounded text-sm opacity-0 hover:opacity-100 transition-opacity">
                    VMC Status: Active
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">VMC Utilization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Setup Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Production Output</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {(machineData?.machines || []).map((machine: any, i: number) => {
                const machineName = machine.name || `VMC ${i + 1}`
                const statuses = ['Underused', 'Active', 'Maintenance', 'Setup']
                const colors = ['gray', 'green', 'red', 'yellow']
                
                // Determine status based on actual utilization
                let statusIndex = 0
                if (machine.utilization >= 80) statusIndex = 1 // Active
                else if (machine.utilization >= 50) statusIndex = 0 // Underused
                else statusIndex = 2 // Maintenance
                
                const status = statuses[statusIndex]
                const color = colors[statusIndex]
                
                return (
                  <Card key={i} className={`shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${
                    color === 'green' ? 'border-l-green-500' :
                    color === 'red' ? 'border-l-red-500' :
                    color === 'yellow' ? 'border-l-yellow-500' : 'border-l-gray-500'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{machineName}</CardTitle>
                        <Badge className={`${
                          color === 'green' ? 'bg-green-100 text-green-800' :
                          color === 'red' ? 'bg-red-100 text-red-800' :
                          color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                          <Factory className="w-8 h-8 text-gray-500" />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Run Hours:</span>
                          <span className="font-medium">{machine.runHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Setup Hours:</span>
                          <span className="font-medium">{machine.setupHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Batches:</span>
                          <span className="font-medium">{machine.batches}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Utilization</span>
                          <span>{machine.utilization.toFixed(1)}%</span>
                        </div>
                        <Progress value={machine.utilization} className="h-2" />
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <div>Operator: {machine.operator || 'Unassigned'}</div>
                        <div>Next Maint: {machine.nextMaintenance || 'Not scheduled'}</div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          Schedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Top Performing Machines Table */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-purple-600" />
                  Machine Performance Rankings
                </CardTitle>
                <CardDescription>Top performing machines with efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(machineData?.machines || []).map((machine: any, i: number) => {
                        const utilization = machine.utilization
                        const efficiency = machine.utilization // Use utilization as efficiency
                        const statuses = ['Active', 'Underused', 'Maintenance', 'Setup']
                        const statusColors = ['green', 'yellow', 'red', 'blue']
                        
                        // Determine status based on actual utilization
                        let statusIndex = 0
                        if (machine.utilization >= 80) statusIndex = 0 // Active
                        else if (machine.utilization >= 50) statusIndex = 1 // Underused
                        else statusIndex = 2 // Maintenance
                        
                        const status = statuses[statusIndex]
                        const statusColor = statusColors[statusIndex]
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {i + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{machine.name || `VMC ${i + 1}`}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Progress value={utilization} className="w-20 mr-3" />
                                <span className="text-sm text-gray-900">{utilization}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${
                                efficiency >= 80 ? 'bg-green-100 text-green-800' :
                                efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {efficiency}%
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${
                                statusColor === 'green' ? 'bg-green-100 text-green-800' :
                                statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                statusColor === 'red' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Machine Location & Service Level */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                    Machine Service Level
                  </CardTitle>
                  <CardDescription>Monthly breakdown of service hours by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: 'Production', hours: 120, color: 'bg-green-500', percentage: 45 },
                      { category: 'Setup', hours: 60, color: 'bg-yellow-500', percentage: 22 },
                      { category: 'Maintenance', hours: 40, color: 'bg-red-500', percentage: 15 },
                      { category: 'Idle', hours: 48, color: 'bg-gray-500', percentage: 18 }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.category}</span>
                          <span className="font-medium">{item.hours}h ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Hours</span>
                        <span>268h</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Maintenance Schedule
                  </CardTitle>
                  <CardDescription>Upcoming maintenance and service dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { machine: 'VMC 3', type: 'Preventive', date: 'Tomorrow', priority: 'high' },
                      { machine: 'VMC 7', type: 'Repair', date: 'Friday', priority: 'medium' },
                      { machine: 'VMC 1', type: 'Calibration', date: 'Next Week', priority: 'low' },
                      { machine: 'VMC 9', type: 'Preventive', date: 'Dec 15', priority: 'medium' }
                    ].map((maintenance, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        maintenance.priority === 'high' ? 'bg-red-50 border-red-500' :
                        maintenance.priority === 'medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{maintenance.machine}</div>
                            <div className="text-sm text-gray-600">{maintenance.type}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{maintenance.date}</div>
                            <Badge className={`mt-1 ${
                              maintenance.priority === 'high' ? 'bg-red-100 text-red-800' :
                              maintenance.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {maintenance.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4" variant="outline">
                      Add Maintenance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert & Notifications Panel */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Alerts & Notifications
                </CardTitle>
                <CardDescription>Real-time machine alerts and system notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'critical', message: 'VMC 5 requires immediate maintenance - bearing failure detected', time: '2 minutes ago' },
                    { type: 'warning', message: 'VMC 2 utilization below 30% - consider task redistribution', time: '15 minutes ago' },
                    { type: 'info', message: 'Scheduled maintenance completed for VMC 8', time: '1 hour ago' },
                    { type: 'success', message: 'All machines running within optimal parameters', time: '2 hours ago' }
                  ].map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      alert.type === 'info' ? 'bg-blue-50 border-blue-500' : 'bg-green-50 border-green-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{alert.message}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.time}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "activity":
        const activityData = memoizedCalculations.activityData
        
        return (
          <div className="space-y-6">
            {/* Activity Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Activities */}
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 mb-1">Total Activities</p>
                      <p className="text-3xl font-bold text-purple-900">{activityData?.totalActivities || 0}</p>
                      <p className="text-xs text-purple-600 mt-1">{activityData?.activeNow || 0} active now</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Today */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Completed Today</p>
                      <p className="text-3xl font-bold text-green-900">{activityData?.completedToday || 0}</p>
                      <p className="text-xs text-green-600 mt-1">+{activityData?.completionRate || 0}% completion rate</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">In Progress</p>
                      <p className="text-3xl font-bold text-blue-900">{activityData?.inProgress || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">{activityData?.avgProgressTime || 0} min avg</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending */}
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600 mb-1">Pending</p>
                      <p className="text-3xl font-bold text-orange-900">{activityData?.pending || 0}</p>
                      <p className="text-xs text-orange-600 mt-1">Waiting for resources</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Heatmap and Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-orange-600" />
                    Activity Heatmap
                  </CardTitle>
                  <CardDescription>Production activity by shift and time</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-1">
                        {/* Days of week */}
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                          <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                            {day}
                          </div>
                        ))}
                        
                        {/* Heatmap cells */}
                        {activityData.heatmap.map((cell: any, index: number) => (
                          <div
                            key={index}
                            className={`h-8 rounded text-xs flex items-center justify-center text-white font-medium ${
                              cell.intensity === 0 ? 'bg-gray-200' :
                              cell.intensity === 1 ? 'bg-green-300' :
                              cell.intensity === 2 ? 'bg-yellow-400' :
                              cell.intensity === 3 ? 'bg-orange-500' : 'bg-red-600'
                            }`}
                            title={`${cell.shift}: ${cell.activities} activities`}
                          >
                            {cell.activities}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Less</span>
                        <div className="flex gap-1">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div className="w-4 h-4 bg-green-300 rounded"></div>
                          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <div className="w-4 h-4 bg-red-600 rounded"></div>
                        </div>
                        <span>More</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Thermometer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
                      <p className="text-gray-600">Activity heatmap will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-600" />
                    Activity Timeline
                  </CardTitle>
                  <CardDescription>Recent activity trends and patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityData ? (
                    <div className="space-y-4">
                      {activityData.recentActivities.map((activity: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-3 h-3 rounded-full ${
                            activity.status === 'completed' ? 'bg-green-500' :
                            activity.status === 'in_progress' ? 'bg-blue-500' :
                            activity.status === 'pending' ? 'bg-orange-500' : 'bg-gray-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{activity.task}</span>
                              <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {activity.machine} • {activity.operator} • {activity.duration}
                            </div>
                          </div>
                          <Badge className={
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            activity.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                          }>
                            {activity.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
                      <p className="text-gray-600">Activity timeline will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "alerts":
        const alertData = memoizedCalculations.alertData
        
        return (
          <div className="space-y-6">
            {/* Alert Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Critical Alerts */}
              <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-1">Critical Alerts</p>
                      <p className="text-3xl font-bold text-red-900">{alertData?.critical || 0}</p>
                      <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning Alerts */}
              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600 mb-1">Warnings</p>
                      <p className="text-3xl font-bold text-yellow-900">{alertData?.warnings || 0}</p>
                      <p className="text-xs text-yellow-600 mt-1">Monitor closely</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Alerts */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Info Alerts</p>
                      <p className="text-3xl font-bold text-blue-900">{alertData?.info || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">Informational</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resolved */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Resolved Today</p>
                      <p className="text-3xl font-bold text-green-900">{alertData?.resolved || 0}</p>
                      <p className="text-xs text-green-600 mt-1">Successfully handled</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Active Alerts
                  </CardTitle>
                  <CardDescription>Current system alerts requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertData ? (
                    <div className="space-y-4">
                      {alertData.activeAlerts.map((alert: any, index: number) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                          alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {alert.severity === 'critical' ? (
                                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                              ) : alert.severity === 'warning' ? (
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
                                <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{alert.source}</span>
                                  <span>{alert.time}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={`${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {alert.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                      <p className="text-gray-600">All systems are running normally</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    Alert Trends
                  </CardTitle>
                  <CardDescription>Alert frequency and resolution trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{alertData.critical}</div>
                          <div className="text-sm text-gray-600">Critical</div>
                          <div className="text-xs text-red-600 mt-1">↑ 2 from yesterday</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{alertData.warnings}</div>
                          <div className="text-sm text-gray-600">Warnings</div>
                          <div className="text-xs text-yellow-600 mt-1">↓ 1 from yesterday</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Average Resolution Time</span>
                          <Badge className="bg-blue-100 text-blue-800">2.3h</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Alert Response Rate</span>
                          <Badge className="bg-green-100 text-green-800">98%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Auto-Resolved Alerts</span>
                          <Badge className="bg-purple-100 text-purple-800">45%</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Alert Trends</h3>
                      <p className="text-gray-600">Alert trends will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "analytics":
        const analyticsData = memoizedCalculations.analyticsData
        
        return (
          <div className="space-y-6">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Efficiency Score */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 mb-1">Efficiency Score</p>
                      <p className="text-3xl font-bold text-indigo-900">{Math.round((analyticsData?.efficiencyScore || 0) * 100)}%</p>
                      <p className="text-xs text-indigo-600 mt-1">Overall performance</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Throughput */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Throughput</p>
                      <p className="text-3xl font-bold text-green-900">{analyticsData?.throughput || 0}</p>
                      <p className="text-xs text-green-600 mt-1">Parts per hour</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Rate */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Quality Rate</p>
                      <p className="text-3xl font-bold text-blue-900">{Math.round((analyticsData?.qualityRate || 0) * 100)}%</p>
                      <p className="text-xs text-blue-600 mt-1">First-pass yield</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Throughput */}
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600 mb-1">Throughput</p>
                      <p className="text-3xl font-bold text-orange-900">{analyticsData?.throughput || 0}</p>
                      <p className="text-xs text-orange-600 mt-1">Parts per hour</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-600" />
                    Performance Trends
                  </CardTitle>
                  <CardDescription>Weekly performance metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{analyticsData.weekOverWeek}%</div>
                          <div className="text-sm text-gray-600">Week-over-Week</div>
                          <div className="text-xs text-blue-600 mt-1">
                            {analyticsData.weekOverWeek > 0 ? '↑' : '↓'} {Math.abs(analyticsData.weekOverWeek)}%
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{analyticsData.movingAverage}%</div>
                          <div className="text-sm text-gray-600">Moving Average</div>
                          <div className="text-xs text-green-600 mt-1">7-day trend</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Predictive Score</span>
                          <Badge className="bg-purple-100 text-purple-800">{analyticsData.predictiveScore}%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Trend Direction</span>
                          <Badge className={`${analyticsData.trendDirection === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {analyticsData.trendDirection === 'up' ? '↗ Improving' : '↘ Declining'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Performance Rating</span>
                          <Badge className={`${
                            analyticsData.efficiencyScore >= 0.9 ? 'bg-green-100 text-green-800' :
                            analyticsData.efficiencyScore >= 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {analyticsData.efficiencyScore >= 0.9 ? 'Excellent' :
                             analyticsData.efficiencyScore >= 0.7 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
                      <p className="text-gray-600">Performance trends will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-green-600" />
                    Resource Allocation
                  </CardTitle>
                  <CardDescription>Resource utilization and allocation analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">{analyticsData.resourceUtilization.machines}%</div>
                          <div className="text-sm text-gray-600">Machine Utilization</div>
                          <div className="text-xs text-gray-500 mt-1">Average across all machines</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">{analyticsData.resourceUtilization.personnel}%</div>
                          <div className="text-sm text-gray-600">Personnel Utilization</div>
                          <div className="text-xs text-gray-500 mt-1">Operator efficiency</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Optimal Resource Allocation</span>
                          <Badge className="bg-green-100 text-green-800">85%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Resource Waste</span>
                          <Badge className="bg-orange-100 text-orange-800">15%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Capacity Planning Score</span>
                          <Badge className="bg-blue-100 text-blue-800">92%</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Resource Data</h3>
                      <p className="text-gray-600">Resource allocation will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      default:
        return <div>Select a section</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/Epsilologo.svg" 
                alt="Epsilon Logo" 
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Schedule Dashboard</h1>
              <p className="text-xs text-gray-600">Detailed Analytics</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userEmail || 'User'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
                </h2>
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  System Online
                </Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGoToMainDashboard}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Main Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGoToScheduler}
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                >
                  <Cog className="w-4 h-4 mr-2" />
                  Schedule Generator
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGoToChart}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Chart
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/attendance'}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Attendance
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshData}
                  className="border-green-300 text-green-600 hover:bg-green-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout} 
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
