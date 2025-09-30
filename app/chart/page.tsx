"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/app/contexts/auth-context"
import {
  BarChart3,
  Activity,
  LogOut,
  Cog,
  User,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Settings,
  Clock,
  Users,
  Cpu,
  Package,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  GripVertical,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react"

// Types for our timeline data
interface Task {
  id: string
  name: string
  machine: string
  startTime: Date
  endTime: Date
  duration: number // in minutes
  status: 'setup' | 'production' | 'idle' | 'maintenance' | 'not-started' | 'in-progress' | 'completed'
  operator?: string
  partNumber?: string
  batchId?: string
  operationNumber?: string
  operationName?: string
  quantity?: number
  orderQty?: number
  setupDuration?: number // in minutes
  runDuration?: number // in minutes
  priority: 'high' | 'medium' | 'low'
  dependencies?: string[]
  isSetup?: boolean
}

interface Machine {
  id: string
  name: string
  status: 'active' | 'idle' | 'maintenance'
  utilization: number
}

interface Connection {
  id: string
  fromTask: string
  toTask: string
  type: 'operation-sequence' | 'batch-flow'
  color: string
}

export default function ChartPage() {
  const { userEmail, logout } = useAuth()
  const router = useRouter()
  
  // State management
  const [activeTab, setActiveTab] = useState("timeline")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [scrollPosition, setScrollPosition] = useState(0)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [timelineView, setTimelineView] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  
  // Timeline container ref for scroll and zoom
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  
  // Machines data - loaded from Supabase
  const [machines, setMachines] = useState<Machine[]>([])
  
  const [tasks, setTasks] = useState<Task[]>([])

  // Connection data for operation sequences and batch flows
  const [connections, setConnections] = useState<Connection[]>([])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load chart data from Supabase on component mount
  useEffect(() => {
    const loadChartData = async () => {
      try {
        // First try to load from the dedicated scheduling results table
        const schedulingResponse = await fetch('/api/store-scheduling-results')
        if (schedulingResponse.ok) {
          const schedulingResult = await schedulingResponse.json()
          if (schedulingResult.success && schedulingResult.data && schedulingResult.data.length > 0) {
            console.log('Loading real scheduling data from scheduling_outputs table:', schedulingResult.data.length, 'records')
            
            // Convert scheduling results to chart format
            const realTasks = schedulingResult.data.map((result: any, index: number) => {
              // Parse timing to get duration in milliseconds
              let duration = 28800 * 1000 // 8 hours default
              if (result.timing) {
                let totalMs = 0
                const daysMatch = result.timing.match(/(\d+)D/)
                if (daysMatch) totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000
                const hoursMatch = result.timing.match(/(\d+)H/)
                if (hoursMatch) totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000
                const minutesMatch = result.timing.match(/(\d+)M/)
                if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000
                duration = totalMs || duration
              }
              
              // Calculate actual duration from start/end times
              const startTime = result.run_start ? new Date(result.run_start) : new Date()
              const endTime = result.run_end ? new Date(result.run_end) : new Date(Date.now() + duration)
              const actualDuration = endTime.getTime() - startTime.getTime()
              
              return {
                id: `${result.part_number}-${result.batch_id}-Op${result.operation_seq}`,
                name: `${result.part_number}-${result.batch_id}-Op${result.operation_seq}`,
                machine: result.machine?.toLowerCase().replace(/\s+/g, '') || 'vmc1',
                startTime: startTime,
                endTime: endTime,
                duration: actualDuration / (1000 * 60), // Convert to minutes using actual time difference
                status: result.status?.toLowerCase() === 'scheduled' ? 'not-started' : 'not-started',
                operator: result.person || 'A',
                partNumber: result.part_number || 'PN',
                batchId: result.batch_id || 'B',
                operationNumber: result.operation_seq?.toString() || index.toString(),
                operationName: result.operation_name || 'Operation',
                quantity: result.batch_qty || 100,
                orderQty: result.order_qty || result.batch_qty || 100,
                setupDuration: 90,
                runDuration: Math.max(actualDuration / (1000 * 60) - 90, 30),
                priority: result.priority?.toLowerCase() || 'medium',
                isSetup: false
              }
            })
            
            setTasks(realTasks)
            
            setMachines([
              { id: 'vmc1', name: 'VMC 1', status: 'active', utilization: 85 },
              { id: 'vmc2', name: 'VMC 2', status: 'active', utilization: 72 },
              { id: 'vmc3', name: 'VMC 3', status: 'active', utilization: 45 },
              { id: 'vmc4', name: 'VMC 4', status: 'active', utilization: 91 },
              { id: 'vmc5', name: 'VMC 5', status: 'maintenance', utilization: 0 },
              { id: 'vmc6', name: 'VMC 6', status: 'active', utilization: 68 },
              { id: 'vmc7', name: 'VMC 7', status: 'active', utilization: 32 },
              { id: 'vmc8', name: 'VMC 8', status: 'active', utilization: 78 },
              { id: 'vmc9', name: 'VMC 9', status: 'active', utilization: 65 },
              { id: 'vmc10', name: 'VMC 10', status: 'active', utilization: 55 }
            ])
            
            console.log('Loaded real scheduling data with', realTasks.length, 'tasks')
            return // Exit early since we loaded real data
          }
        }

        // Fallback: Load chart data from Supabase cloud (legacy format)
        const response = await fetch('/api/load-chart-data')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.length > 0) {
            // Check if it's new chart data format from dashboard_data table
            const latestData = result.data[0]
            if (latestData.dashboard_session_id && latestData.chart_data) {
              // New format: chart data stored in dashboard_data table
              const loadedTasks = latestData.chart_data.tasks.map((task: any, index: number) => {
                // Calculate proper start and end times if they're null
                let startTime = task.startTime ? new Date(task.startTime) : null
                let endTime = task.endTime ? new Date(task.endTime) : null
                
                // If times are null, calculate them based on duration and current time
                if (!startTime || !endTime) {
                  const now = new Date()
                  const taskStart = new Date(now.getTime() + (index * 2 * 60 * 60 * 1000)) // 2 hours between tasks
                  const duration = task.duration ? task.duration * 60 * 1000 : 8 * 60 * 60 * 1000 // 8 hours default
                  startTime = taskStart
                  endTime = new Date(taskStart.getTime() + duration)
                }
                
                return {
                  ...task,
                  id: task.id || `task-${index}`,
                  name: task.name || `Task ${index}`,
                  startTime,
                  endTime
                }
              })
              setTasks(loadedTasks)
              
              if (latestData.machine_data && latestData.machine_data.machines) {
                setMachines(latestData.machine_data.machines)
              }
              
              if (latestData.timeline_view) {
                setTimelineView(latestData.timeline_view)
              }
              
              console.log('Loaded chart data from Supabase cloud (dashboard_data format)')
            } else if (latestData.data_type === 'chart_data' && latestData.chart_data && latestData.chart_data.tasks) {
              // Legacy format: chart data stored in timeline_data table
              const loadedTasks = latestData.chart_data.tasks.map((task: any, index: number) => {
                // Calculate proper start and end times if they're null
                let startTime = task.startTime ? new Date(task.startTime) : null
                let endTime = task.endTime ? new Date(task.endTime) : null
                
                // If times are null, calculate them based on duration and current time
                if (!startTime || !endTime) {
                  const now = new Date()
                  const taskStart = new Date(now.getTime() + (index * 2 * 60 * 60 * 1000)) // 2 hours between tasks
                  const duration = task.duration ? task.duration * 60 * 1000 : 8 * 60 * 60 * 1000 // 8 hours default
                  startTime = taskStart
                  endTime = new Date(taskStart.getTime() + duration)
                }
                
                return {
                  ...task,
                  id: task.id || `task-${index}`,
                  name: task.name || `Task ${index}`,
                  startTime,
                  endTime
                }
              })
              setTasks(loadedTasks)
              
              if (latestData.machine_data && latestData.machine_data.machines) {
                setMachines(latestData.machine_data.machines)
              }
              
              if (latestData.timeline_view) {
                setTimelineView(latestData.timeline_view)
              }
              
              console.log('Loaded chart data from Supabase cloud (timeline_data format)')
            } else {
              // Legacy format: convert timeline data to chart tasks
              const chartTasks = result.data.map((item: any, index: number) => ({
                id: `${item.part_number || 'PN'}-${item.batch_id || 'B'}-Op${item.operation_seq || index}`,
                name: `${item.part_number || 'PN'}-${item.batch_id || 'B'}-Op${item.operation_seq || index}`,
                machine: item.machine?.toLowerCase().replace(' ', '') || 'vmc1',
                startTime: new Date(item.setup_start || item.run_start),
                endTime: new Date(item.run_end || item.setup_end),
                duration: item.timing ? parseInt(item.timing.replace(/[^\d]/g, '')) * 60 : 480,
                status: item.status?.toLowerCase() === 'completed' ? 'completed' : 
                       item.status?.toLowerCase() === 'in progress' ? 'in-progress' : 'not-started',
                operator: item.person || 'A',
                partNumber: item.part_number || 'PN',
                batchId: item.batch_id || 'B',
                operationNumber: item.operation_seq?.toString() || index.toString(),
                operationName: item.operation_name || 'Operation',
                quantity: item.batch_qty || 100,
                orderQty: item.order_quantity || item.batch_qty || 100,
                setupDuration: 90,
                runDuration: item.timing ? parseInt(item.timing.replace(/[^\d]/g, '')) * 60 - 90 : 390,
                priority: item.priority?.toLowerCase() || 'medium',
                isSetup: false
              }))
              
              setTasks(chartTasks)
              console.log('Loaded chart data from Supabase cloud (legacy format)')
            }
          }
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
      }
    }

    loadChartData()
  }, [])

  // Auto-scroll to current time on load
  useEffect(() => {
    const scrollToNow = () => {
      if (timelineContainerRef.current) {
        const now = new Date()
        let scrollPosition = 0
        
        switch (timelineView) {
          case 'hour': {
            const currentHour = now.getHours() + now.getMinutes() / 60
            scrollPosition = currentHour * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
            break
          }
        case 'day': {
          const { startDate } = timelineDateRange
          const todayIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          scrollPosition = todayIndex * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
          break
        }
          case 'week': {
            const startWeek = new Date(now)
            startWeek.setDate(now.getDate() - now.getDay() - (30 * 7)) // 30 weeks past
            const currentWeek = new Date(now)
            currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()) // Start of week
            const weeksDiff = Math.floor((currentWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24 * 7))
            scrollPosition = weeksDiff * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
            break
          }
          case 'month': {
            const startMonth = new Date(now.getFullYear(), now.getMonth() - 12, 1) // 12 months past
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const monthsDiff = (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                              (currentMonth.getMonth() - startMonth.getMonth())
            scrollPosition = monthsDiff * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
            break
          }
        }
        
        timelineContainerRef.current.scrollLeft = Math.max(0, scrollPosition)
        setScrollPosition(scrollPosition)
      }
    }
    setTimeout(scrollToNow, 100) // Small delay to ensure DOM is ready
  }, [timelineView])

  // Handle zoom controls
  const handleZoomIn = () => setZoomLevel((prev: number) => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoomLevel((prev: number) => Math.max(prev - 0.2, 0.5))
  const handleResetZoom = () => setZoomLevel(1)

  // Jump to current time
  const jumpToNow = () => {
    if (timelineContainerRef.current) {
      const now = new Date()
      let scrollPosition = 0
      
      switch (timelineView) {
        case 'hour': {
          const currentHour = now.getHours() + now.getMinutes() / 60
          scrollPosition = currentHour * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
          break
        }
        case 'day': {
          const { startDate } = timelineDateRange
          const todayIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          scrollPosition = todayIndex * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
          break
        }
        case 'week': {
          const startWeek = new Date(now)
          startWeek.setDate(now.getDate() - now.getDay() - (30 * 7)) // 30 weeks past
          const currentWeek = new Date(now)
          currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()) // Start of week
          const weeksDiff = Math.floor((currentWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24 * 7))
          scrollPosition = weeksDiff * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
          break
        }
        case 'month': {
          const startMonth = new Date(now.getFullYear(), now.getMonth() - 12, 1) // 12 months past
          const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthsDiff = (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                            (currentMonth.getMonth() - startMonth.getMonth())
          scrollPosition = monthsDiff * getScaleInfo().pixelsPerUnit - timelineContainerRef.current.clientWidth / 2
          break
        }
      }
      
      timelineContainerRef.current.scrollLeft = Math.max(0, scrollPosition)
      setScrollPosition(scrollPosition)
    }
  }

  // Handle timeline scroll
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft)
  }

  // Sync chart data to dashboard
  const handleSyncDashboard = async () => {
    try {
      // Generate unique session ID
      const sessionId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare chart data for Supabase
      const chartData = {
        tasks: tasks.map((task: Task) => ({
          id: task.id,
          partNumber: task.partNumber,
          batchId: task.batchId,
          operationNumber: task.operationNumber,
          operationName: task.operationName,
          machine: task.machine,
          operator: task.operator,
          startTime: task.startTime.toISOString(),
          endTime: task.endTime.toISOString(),
          duration: task.duration,
          status: task.status,
          quantity: task.quantity,
          setupDuration: task.setupDuration,
          runDuration: task.runDuration,
          priority: task.priority
        })),
        currentTime: currentTime.toISOString(),
        scrollPosition: scrollPosition
      }

      // Prepare machine data
      const machineData = {
        machines: (machines || []).map((machine: Machine) => ({
          id: machine.id,
          name: machine.name,
          status: machine.status,
          utilization: machine.utilization
        }))
      }

      // Store in Supabase
      const response = await fetch('/api/sync-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail || 'default@user.com', // Add user email header
        },
        body: JSON.stringify({
          dashboard_session_id: sessionId,
          session_name: `Dashboard Sync ${new Date().toLocaleDateString()}`,
          timeline_view: timelineView,
          chart_data: chartData,
          machine_data: machineData
        })
      })

      if (response.ok) {
        // Also store in localStorage as backup
        localStorage.setItem('chartSyncData', JSON.stringify({
          sessionId,
          timestamp: new Date().toISOString(),
          timelineView,
          chartData,
          machineData
        }))
        
        alert('Chart data synced to dashboard successfully!')
      } else {
        throw new Error('Failed to sync to Supabase')
      }
      
    } catch (error) {
      console.error('Error syncing dashboard:', error)
      alert('Failed to sync chart data to dashboard')
    }
  }

  // Handle Excel file import
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Load XLSX library dynamically
      const XLSX = await import('xlsx')
      
      // Read the Excel file
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get sheet names
          const sheetNames = workbook.SheetNames
          // console.log('Available sheets:', sheetNames) // Commented out for performance
          
          // Find Input and Output sheets (case-insensitive)
          const inputSheet = sheetNames.find(name => name.toLowerCase().includes('input'))
          const outputSheet = sheetNames.find(name => name.toLowerCase().includes('output'))
          
          if (!inputSheet || !outputSheet) {
            alert('Excel file must contain "Input" and "Output" sheets')
            return
          }
          
          // Parse Input sheet
          const inputData = XLSX.utils.sheet_to_json(workbook.Sheets[inputSheet])
          // console.log('Input data:', inputData) // Commented out for performance
          
          // Parse Output sheet
          const outputData = XLSX.utils.sheet_to_json(workbook.Sheets[outputSheet])
          // console.log('Output data:', outputData) // Commented out for performance
          
          // Convert output data to chart tasks format
          const importedTasks = outputData.map((row: any, index: number) => {
            // Parse timing to get duration
            let duration = 28800 * 1000 // 8 hours default
            if (row.Timing) {
              let totalMs = 0
              const daysMatch = row.Timing.match(/(\d+)D/)
              if (daysMatch) totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000
              const hoursMatch = row.Timing.match(/(\d+)H/)
              if (hoursMatch) totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000
              const minutesMatch = row.Timing.match(/(\d+)M/)
              if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000
              duration = totalMs || duration
            }
            
            // Parse start and end times
            const startTime = row.RunStart ? new Date(row.RunStart) : new Date()
            const endTime = row.RunEnd ? new Date(row.RunEnd) : new Date(Date.now() + duration)
            
            // Debug logging for date parsing (commented out for performance)
            // console.log(`Task ${row.PartNumber}-${row.Batch_ID}: Start=${startTime.toISOString()}, End=${endTime.toISOString()}`)
            
            return {
              id: `${row.PartNumber}-${row.Batch_ID}-Op${row.OperationSeq}`,
              name: `${row.PartNumber}-${row.Batch_ID}-Op${row.OperationSeq}`,
              partNumber: row.PartNumber,
              batchId: row.Batch_ID,
              operationNumber: row.OperationSeq,
              operationName: row.OperationName,
              machine: row.Machine?.toLowerCase().replace(/\s+/g, '') || 'vmc1',
              operator: row.Person || row.Operator || 'Unknown',
              startTime: startTime,
              endTime: endTime,
              duration: duration / (1000 * 60), // Convert to minutes
              status: 'in-progress' as const,
              quantity: row.Batch_Qty || row.Order_Quantity || 100,
              setupDuration: 90, // Default setup time
              runDuration: Math.max(duration / (1000 * 60) - 90, 30),
              timing: row.Timing || 'N/A',
              dueDate: row.DueDate || null,
              priority: row.Priority || 'normal'
            }
          })
          
          // Update tasks with imported data
          setTasks(importedTasks)
          
          // Ensure machines array includes all machines from imported data
          const uniqueMachines = Array.from(new Set(importedTasks.map(task => task.machine)))
          const newMachines = uniqueMachines.map(machineId => {
            const existingMachine = machines.find(m => m.id === machineId)
            if (existingMachine) return existingMachine
            
            // Create new machine entry
            const machineName = machineId.toUpperCase().replace(/(\d+)/, ' $1') // vmc1 -> VMC 1
            return {
              id: machineId,
              name: machineName,
              status: 'active' as const,
              utilization: 0
            }
          })
          
          if (newMachines.length > 0) {
            setMachines(prevMachines => {
              const combined = [...prevMachines]
              newMachines.forEach(newMachine => {
                if (!combined.find(m => m.id === newMachine.id)) {
                  combined.push(newMachine)
                }
              })
              return combined
            })
          }
          
          // Store imported data in Supabase for dashboard use
          const response = await fetch('/api/store-scheduling-results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': userEmail || 'default@user.com',
            },
            body: JSON.stringify({
              schedulingResults: outputData,
              inputData: inputData,
              importedAt: new Date().toISOString()
            })
          })
          
          if (response.ok) {
            alert(`Successfully imported ${importedTasks.length} tasks from Excel file`)
            // console.log('Imported tasks:', importedTasks) // Commented out for performance
          } else {
            alert('Data imported but failed to save to database')
          }
          
        } catch (error) {
          console.error('Error parsing Excel file:', error)
          alert('Error parsing Excel file. Please ensure it has the correct format.')
        }
      }
      
      reader.readAsArrayBuffer(file)
      
    } catch (error) {
      console.error('Error importing Excel file:', error)
      alert('Failed to import Excel file. Please try again.')
    }
  }

  // Get task status color
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'bg-blue-400'
      case 'in-progress': return 'bg-green-500'
      case 'completed': return 'bg-green-600'
      case 'not-started': return 'bg-gray-400'
      case 'maintenance': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  // Get timeline date range based on tasks and view (memoized for performance)
  const timelineDateRange = useMemo(() => {
    if (tasks.length === 0) {
      // Default range if no tasks
      const now = new Date()
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1), // 6 months back
        endDate: new Date(now.getFullYear(), now.getMonth() + 6, 31)   // 6 months forward
      }
    }

    // Find min and max dates from all tasks
    const allDates = tasks.flatMap(task => [task.startTime, task.endTime])
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    // Add buffer based on timeline view
    const buffer = timelineView === 'hour' ? 2 : timelineView === 'day' ? 7 : timelineView === 'week' ? 4 : 2
    
    return {
      startDate: new Date(minDate.getTime() - (buffer * 24 * 60 * 60 * 1000)),
      endDate: new Date(maxDate.getTime() + (buffer * 24 * 60 * 60 * 1000))
    }
  }, [tasks, timelineView])

  // Generate timeline markers based on view (memoized for performance)
  const timelineMarkers = useMemo(() => {
    switch (timelineView) {
              case 'hour':
                const hours = []
                // Show 24 hours (0-23) for unlimited scrolling
                for (let hour = 0; hour < 24; hour++) {
                  hours.push({ 
                    value: hour, 
                    label: hour === 0 ? '12:00 AM' : 
                           hour < 12 ? `${hour}:00 AM` :
                           hour === 12 ? '12:00 PM' :
                           `${hour - 12}:00 PM`,
                    type: 'hour',
                    isPM: hour >= 12
                  })
                }
                return hours
      
      case 'day':
        const days = []
        const { startDate, endDate } = timelineDateRange
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        for (let i = 0; i < totalDays; i++) {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + i)
          
          const isToday = date.toDateString() === new Date().toDateString()
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          
          days.push({ 
            value: date.getTime(), 
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type: 'day',
            date: date,
            isToday: isToday,
            isWeekend: isWeekend
          })
        }
        return days
      
      case 'week':
        const weeks = []
        const todayForWeeks = new Date()
        const startWeek = new Date(todayForWeeks)
        startWeek.setDate(todayForWeeks.getDate() - todayForWeeks.getDay() - (30 * 7)) // 30 weeks past
        
        for (let i = 0; i < 120; i++) { // 30 weeks past + 90 weeks future = 120 weeks total
          const weekStart = new Date(startWeek)
          weekStart.setDate(startWeek.getDate() + (i * 7))
          
          const isCurrentWeek = weekStart.getTime() <= todayForWeeks.getTime() && 
                               todayForWeeks.getTime() < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).getTime()
          
          weeks.push({ 
            value: weekStart.getTime(), 
            label: `Week ${i + 1}`,
            type: 'week',
            date: weekStart,
            isCurrentWeek: isCurrentWeek
          })
        }
        return weeks
      
      case 'month':
        const months = []
        const currentDate = new Date()
        const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 12, 1) // 12 months past
        
        for (let i = 0; i < 36; i++) { // 12 months past + 24 months future = 36 months total
          const month = new Date(startMonth)
          month.setMonth(startMonth.getMonth() + i)
          
          const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() && 
                                month.getMonth() === currentDate.getMonth()
          
          months.push({ 
            value: month.getTime(), 
            label: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            type: 'month',
            date: month,
            isCurrentMonth: isCurrentMonth
          })
        }
        return months
      
      default:
        return []
    }
  }, [timelineView, timelineDateRange])

  const generateTimelineMarkers = useCallback(() => timelineMarkers, [timelineMarkers])

  // Get scale information based on timeline view (memoized for performance)
  const scaleInfo = useMemo(() => {
    switch (timelineView) {
      case 'hour':
        return { pixelsPerUnit: 100, unit: 'hour', label: '100px = 1 hour' }
      case 'day':
        return { pixelsPerUnit: 100, unit: 'day', label: '100px = 1 day' }
      case 'week':
        return { pixelsPerUnit: 80, unit: 'week', label: '80px = 1 week' }
      case 'month':
        return { pixelsPerUnit: 120, unit: 'month', label: '120px = 1 month' }
      default:
        return { pixelsPerUnit: 100, unit: 'hour', label: '100px = 1 hour' }
    }
  }, [timelineView])

  const getScaleInfo = useCallback(() => scaleInfo, [scaleInfo])

  // Calculate timeline position based on current view
  const getTaskPosition = (task: Task) => {
    const scaleInfo = getScaleInfo()
    
    switch (timelineView) {
      case 'hour': {
        const taskStartHour = task.startTime.getHours() + task.startTime.getMinutes() / 60
        const taskDuration = task.duration / 60 // Convert to hours
        
        const leftPixels = taskStartHour * scaleInfo.pixelsPerUnit
        const widthPixels = taskDuration * scaleInfo.pixelsPerUnit
        
        return { leftPixels, widthPixels }
      }
      
      case 'day': {
        const { startDate } = timelineDateRange
        
        const taskStartDate = new Date(task.startTime.getFullYear(), task.startTime.getMonth(), task.startTime.getDate())
        const taskEndDate = new Date(task.endTime.getFullYear(), task.endTime.getMonth(), task.endTime.getDate())
        
        const daysDiff = Math.floor((taskStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const durationDays = Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        const leftPixels = daysDiff * scaleInfo.pixelsPerUnit
        const widthPixels = Math.max(durationDays * scaleInfo.pixelsPerUnit, 60) // Minimum 60px width
        
        return { leftPixels, widthPixels }
      }
      
      case 'week': {
        const today = new Date()
        const startWeek = new Date(today)
        startWeek.setDate(today.getDate() - today.getDay() - (30 * 7)) // 30 weeks past
        
        const taskStartWeek = new Date(task.startTime)
        taskStartWeek.setDate(taskStartWeek.getDate() - taskStartWeek.getDay()) // Start of week
        
        const weeksDiff = Math.floor((taskStartWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24 * 7))
        const durationWeeks = Math.ceil((task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60 * 60 * 24 * 7))
        
        const leftPixelsWeek = weeksDiff * scaleInfo.pixelsPerUnit
        const widthPixelsWeek = Math.max(durationWeeks * scaleInfo.pixelsPerUnit, 20) // Minimum width
        
        return { leftPixels: leftPixelsWeek, widthPixels: widthPixelsWeek }
      }
      
      case 'month': {
        const currentDate = new Date()
        const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 12, 1) // 12 months past
        const taskStartMonth = new Date(task.startTime.getFullYear(), task.startTime.getMonth(), 1)
        const taskEndMonth = new Date(task.endTime.getFullYear(), task.endTime.getMonth(), 1)
        
        const monthsDiff = (taskStartMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                          (taskStartMonth.getMonth() - startMonth.getMonth())
        const durationMonths = (taskEndMonth.getFullYear() - taskStartMonth.getFullYear()) * 12 + 
                              (taskEndMonth.getMonth() - taskStartMonth.getMonth()) + 1
        
        const leftPixelsMonth = monthsDiff * scaleInfo.pixelsPerUnit
        const widthPixelsMonth = Math.max(durationMonths * scaleInfo.pixelsPerUnit, 30) // Minimum width
        
        return { leftPixels: leftPixelsMonth, widthPixels: widthPixelsMonth }
      }
      
      default:
        return { leftPixels: 0, widthPixels: 0 }
    }
  }


  // Calculate task position on timeline (memoized for performance)
  const taskPositions = useMemo(() => {
    const positions = new Map<string, { leftPixels: number; widthPixels: number }>()
    
    tasks.forEach(task => {
      const { leftPixels, widthPixels } = getTaskPosition(task)
      const minWidth = 60
      const finalWidthPixels = Math.max(widthPixels, minWidth)
      positions.set(task.id, { leftPixels, widthPixels: finalWidthPixels })
    })
    
    return positions
  }, [tasks, timelineDateRange, scaleInfo])

  const getTaskTimelinePosition = useCallback((task: Task) => {
    return taskPositions.get(task.id) || { leftPixels: 0, widthPixels: 60 }
  }, [taskPositions])

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  // Close task details
  const closeTaskDetails = () => {
    setShowTaskDetails(false)
    setSelectedTask(null)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!editMode) {
      e.preventDefault()
      return
    }
    
    setDraggedTask(task)
    setDragOffset({
      x: e.clientX - e.currentTarget.getBoundingClientRect().left,
      y: e.clientY - e.currentTarget.getBoundingClientRect().top
    })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetMachine: string, targetTime: Date) => {
    e.preventDefault()
    
    if (draggedTask && editMode) {
      // Find all related tasks in the same batch and operation sequence
      const relatedTasks = tasks.filter((task: Task) => 
        task.partNumber === draggedTask.partNumber && 
        task.batchId === draggedTask.batchId
      )
      
      // Sort related tasks by operation number to maintain sequence
      const sortedRelatedTasks = relatedTasks.sort((a: Task, b: Task) => 
        parseInt(a.operationNumber || '0') - parseInt(b.operationNumber || '0')
      )
      
      // Find the dragged task's position in the sequence
      const draggedTaskIndex = sortedRelatedTasks.findIndex((task: Task) => task.id === draggedTask.id)
      
      if (draggedTaskIndex >= 0) {
        // Calculate time offset for the dragged task
        const timeOffset = targetTime.getTime() - draggedTask.startTime.getTime()
        
        // Update all related tasks with proportional time shifts
        setTasks((prevTasks: Task[]) => 
          prevTasks.map((task: Task) => {
            if (task.partNumber === draggedTask.partNumber && task.batchId === draggedTask.batchId) {
              const taskIndex = sortedRelatedTasks.findIndex((t: Task) => t.id === task.id)
              const newStartTime = new Date(task.startTime.getTime() + timeOffset)
              const newEndTime = new Date(task.endTime.getTime() + timeOffset)
              
              return {
                ...task,
                machine: targetMachine, // Move to target machine
                startTime: newStartTime,
                endTime: newEndTime
              }
            }
            return task
          })
        )
        
        // Update connections to maintain relationships
        setConnections((prevConnections: Connection[]) =>
          prevConnections.map((conn: Connection) => {
            // Keep all connections - they will be visually updated by new task positions
            return conn
          })
        )
      }
    }
    
    setDraggedTask(null)
    setDragOffset({ x: 0, y: 0 })
  }


  // Get priority border color for task bars
  const getPriorityBorder = (priority: string) => {
    if (priority === 'high') return 'border-yellow-400 border-2'
    if (priority === 'medium') return 'border-blue-400 border-2'
    return 'border-gray-400 border'
  }

  const handleGoToDashboard = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Premium Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Production Timeline - {(() => {
                      if (tasks.length === 0) return new Date().toLocaleDateString()
                      const { startDate, endDate } = timelineDateRange
                      return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
                    })()}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {tasks.length > 0 ? `${tasks.length} tasks scheduled` : 'Real-time Machine Scheduling & Task Management'}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-gray-500">Welcome, {userEmail}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
              
              {/* Navigation Buttons */}
              <div className="hidden md:flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGoToDashboard}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/scheduler')}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Cog className="w-4 h-4 mr-2" />
                  Schedule Generator
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Chart
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/auth')}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Account
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
              
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline View
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Gantt Chart
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Timeline View */}
          <TabsContent value="timeline" className="space-y-6">
            {/* Timeline Controls */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Production Timeline - {(() => {
                      if (tasks.length === 0) return new Date().toLocaleDateString()
                      const { startDate, endDate } = timelineDateRange
                      return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
                    })()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={jumpToNow}
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      Jump to Now
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleZoomOut}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[60px] text-center">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={handleZoomIn}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleResetZoom}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Scale: {getScaleInfo().label} | Scroll: {Math.round(scrollPosition)}px
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Timeline View Controls */}
                    <div className="flex items-center gap-1 border border-gray-300 rounded-md">
                      <Button
                        variant={timelineView === 'hour' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimelineView('hour')}
                        className={timelineView === 'hour' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                      >
                        Hour
                      </Button>
                      <Button
                        variant={timelineView === 'day' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimelineView('day')}
                        className={timelineView === 'day' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                      >
                        Day
                      </Button>
                      <Button
                        variant={timelineView === 'week' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimelineView('week')}
                        className={timelineView === 'week' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                      >
                        Week
                      </Button>
                      <Button
                        variant={timelineView === 'month' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimelineView('month')}
                        className={timelineView === 'month' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                      >
                        Month
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="excel-import"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('excel-import')?.click()}
                        className="text-gray-600 hover:bg-gray-100"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Import
                      </Button>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSyncDashboard}
                      className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Sync Dashboard
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Timeline Container */}
                <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Fixed Machine Sidebar + Scrollable Timeline */}
                  <div className="flex">
                    {/* Fixed Machine Sidebar */}
                    <div className="w-48 bg-gray-50 border-r border-gray-200">
                      {/* Header */}
                      <div className="h-12 bg-gray-100 border-b border-gray-200 flex items-center justify-center font-medium text-sm">
                        Machines
                      </div>
                      
                      {/* Machine List */}
                      <div className="divide-y divide-gray-200">
                        {(machines || []).map((machine: Machine) => (
                          <div key={machine.id} className="h-16 p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                machine.status === 'active' ? 'bg-green-500' :
                                machine.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium">{machine.name}</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                machine.utilization > 80 ? 'border-green-500 text-green-700' :
                                machine.utilization > 60 ? 'border-yellow-500 text-yellow-700' :
                                'border-gray-400 text-gray-600'
                              }`}
                            >
                              {machine.utilization}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Timeline */}
                    <div 
                      ref={timelineContainerRef}
                      className="flex-1 overflow-x-auto overflow-y-hidden"
                      onScroll={handleTimelineScroll}
                      style={{ 
                        maxHeight: '600px',
                        scrollBehavior: 'smooth'
                      }}
                    >
                      {/* Timeline Header */}
                      <div className="h-12 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <div className="relative h-full" style={{ 
                          width: `${timelineMarkers.length * scaleInfo.pixelsPerUnit}px`,
                          minWidth: '100vw' // Ensure timeline is at least full viewport width
                        }}>
                          {/* Timeline Markers */}
                          {timelineMarkers.map((marker: any, index: number) => (
                            <div
                              key={`${marker.type}-${marker.value}`}
                              className={`absolute top-0 bottom-0 border-r border-gray-300 flex items-center justify-center text-xs font-medium ${
                                marker.type === 'day' && 'isToday' in marker && marker.isToday ? 'bg-red-100 text-red-800' :
                                marker.type === 'day' && 'isWeekend' in marker && marker.isWeekend ? 'bg-gray-50 text-gray-500' :
                                'text-gray-600'
                              }`}
                              style={{
                                left: `${index * getScaleInfo().pixelsPerUnit}px`,
                                width: `${getScaleInfo().pixelsPerUnit}px`
                              }}
                            >
                              {marker.label}
                              {marker.type === 'hour' && 'isPM' in marker && marker.isPM && (
                                <div className="text-xs text-gray-500 ml-1">PM</div>
                              )}
                              {marker.type === 'hour' && 'isPM' in marker && !marker.isPM && (
                                <div className="text-xs text-gray-500 ml-1">AM</div>
                              )}
                            </div>
                          ))}
                          
                          {/* Current Time Indicator (NOW line) - All Views */}
                          {(() => {
                            const now = new Date()
                            let nowPosition = 0
                            
                            switch (timelineView) {
                              case 'hour': {
                                const currentHour = now.getHours() + now.getMinutes() / 60
                                nowPosition = currentHour * getScaleInfo().pixelsPerUnit
                                break
                              }
                              case 'day': {
                                const startDate = new Date(now)
                                startDate.setDate(now.getDate() - 30)
                                const todayIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                                nowPosition = todayIndex * getScaleInfo().pixelsPerUnit
                                break
                              }
                              case 'week': {
                                const startWeek = new Date(now)
                                startWeek.setDate(now.getDate() - now.getDay() - (30 * 7)) // 30 weeks past
                                const currentWeek = new Date(now)
                                currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()) // Start of week
                                const weeksDiff = Math.floor((currentWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24 * 7))
                                nowPosition = weeksDiff * getScaleInfo().pixelsPerUnit
                                break
                              }
                              case 'month': {
                                const startMonth = new Date(now.getFullYear(), now.getMonth() - 12, 1) // 12 months past
                                const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                                const monthsDiff = (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                                                  (currentMonth.getMonth() - startMonth.getMonth())
                                nowPosition = monthsDiff * getScaleInfo().pixelsPerUnit
                                break
                              }
                            }
                            
                            return (
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                                style={{
                                  left: `${nowPosition}px`
                                }}
                              >
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                                  NOW
                                </div>
                              </div>
                            )
                          })()}
                          
                        </div>
                      </div>

                      {/* Timeline Rows */}
                      <div className="relative" style={{ width: `${timelineMarkers.length * scaleInfo.pixelsPerUnit}px` }}>
                        {/* NOW Line for Timeline Rows - All Views */}
                        {(() => {
                          const now = new Date()
                          let nowPosition = 0
                          
                          switch (timelineView) {
                            case 'hour': {
                              const currentHour = now.getHours() + now.getMinutes() / 60
                              nowPosition = currentHour * getScaleInfo().pixelsPerUnit
                              break
                            }
                            case 'day': {
                              const startDate = new Date(now)
                              startDate.setDate(now.getDate() - 30)
                              const todayIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                              nowPosition = todayIndex * getScaleInfo().pixelsPerUnit
                              break
                            }
                            case 'week': {
                              const startWeek = new Date(now)
                              startWeek.setDate(now.getDate() - now.getDay() - (30 * 7)) // 30 weeks past
                              const currentWeek = new Date(now)
                              currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()) // Start of week
                              const weeksDiff = Math.floor((currentWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24 * 7))
                              nowPosition = weeksDiff * getScaleInfo().pixelsPerUnit
                              break
                            }
                            case 'month': {
                              const startMonth = new Date(now.getFullYear(), now.getMonth() - 12, 1) // 12 months past
                              const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                              const monthsDiff = (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
                                                (currentMonth.getMonth() - startMonth.getMonth())
                              nowPosition = monthsDiff * getScaleInfo().pixelsPerUnit
                              break
                            }
                          }
                          
                          return (
                            <div 
                              className="absolute top-0 w-0.5 bg-red-500 z-10"
                              style={{
                                left: `${nowPosition}px`,
                                height: `${(machines || []).length * 64}px` // Height of all machine rows
                              }}
                            />
                          )
                        })()}
                        
                        {(machines || []).map((machine: Machine, index: number) => (
                          <div 
                            key={machine.id} 
                            className="h-16 border-b border-gray-100 relative"
                            style={{ 
                              width: `${timelineMarkers.length * scaleInfo.pixelsPerUnit}px`,
                              minWidth: '100vw'
                            }}
                          >
                            {/* Timeline Grid Lines */}
                            {timelineMarkers.map((marker: any, index: number) => (
                              <div
                                key={`grid-${marker.type}-${marker.value}`}
                                className="absolute top-0 bottom-0 border-r border-gray-100"
                                style={{
                                  left: `${index * getScaleInfo().pixelsPerUnit}px`,
                                  width: `${getScaleInfo().pixelsPerUnit}px`
                                }}
                              />
                            ))}

                            {/* Tasks for this machine */}
                            {tasks
                              .filter((task: Task) => task.machine === machine.id)
                              .map((task: Task) => {
                                const { leftPixels, widthPixels } = getTaskTimelinePosition(task)
                                
                                // Debug logging for task positioning (commented out for performance)
                                // console.log(`Task ${task.name} on ${machine.name}: left=${leftPixels}px, width=${widthPixels}px, start=${task.startTime.toISOString()}, end=${task.endTime.toISOString()}`)
                                const setupDuration = task.setupDuration || 30
                                const runDuration = task.runDuration || (task.duration - setupDuration)
                                const setupPercent = (setupDuration / task.duration) * 100
                                const runPercent = (runDuration / task.duration) * 100
                                
                                return (
                                  <div
                                    key={task.id || `task-${index}`}
                                    onClick={() => handleTaskClick(task)}
                                    draggable={editMode}
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    className={`absolute top-2 bottom-2 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 rounded-md overflow-hidden ${
                                      editMode ? 'cursor-move' : 'cursor-pointer'
                                    } ${task.status === 'in-progress' ? 'ring-2 ring-yellow-400' : ''}`}
                                    style={{
                                      left: `${leftPixels}px`,
                                      width: `${widthPixels}px`,
                                      minWidth: '120px'
                                    }}
                                    title={`${task.name}\nStart: ${task.startTime.toLocaleString()}\nEnd: ${task.endTime.toLocaleString()}\nDuration: ${task.duration}min\nStatus: ${task.status}${editMode ? '\n\nDrag to move (Edit Mode)' : ''}`}
                                  >
                                    {/* Unified Bar with Setup and Run Sections */}
                                    <div className="h-full flex w-full">
                                      {/* Setup Section - Blue */}
                                      <div 
                                        className="bg-blue-400 flex items-center justify-center text-white text-xs font-medium px-1 relative"
                                        style={{ width: `${setupPercent}%` }}
                                      >
                                        {editMode && <GripVertical className="w-3 h-3 opacity-70 mr-1" />}
                                        <span className="font-bold truncate">Setup: {task.operator}</span>
                                      </div>
                                      
                                      {/* Run Section - Green */}
                                      <div 
                                        className={`flex items-center justify-between text-white text-xs font-medium px-2 flex-1 ${
                                          task.status === 'completed' ? 'bg-green-600' :
                                          task.status === 'in-progress' ? 'bg-green-500' :
                                          task.status === 'not-started' ? 'bg-gray-400' : 'bg-green-500'
                                        }`}
                                        style={{ width: `${runPercent}%` }}
                                      >
                                        <div className="flex flex-col items-start min-w-0">
                                          <span className="font-bold truncate">{task.partNumber}</span>
                                          <span className="text-xs opacity-90">Batch {task.batchId} | Op{task.operationNumber}</span>
                                        </div>
                                        <div className="flex flex-col items-end text-right min-w-0">
                                          <span className="text-xs opacity-90">{task.operationName}</span>
                                          <span className="text-xs opacity-90">Qty {task.quantity}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}

                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-blue-400 rounded"></div>
                    <span>Setup Section (Operator)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-green-500 rounded"></div>
                    <span>Run Section (In Progress)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-green-600 rounded"></div>
                    <span>Run Section (Completed)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-gray-400 rounded"></div>
                    <span>Run Section (Not Started)</span>
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 border-2 border-blue-600 rounded bg-blue-50"></div>
                      <span>Edit Mode - Drag to Move</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Details Modal */}
            {showTaskDetails && selectedTask && (
              <div className="fixed inset-0 backdrop-blur-sm bg-white/20 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Task Details</h3>
                    <Button variant="outline" size="sm" onClick={closeTaskDetails}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Part Number:</span> {selectedTask.partNumber}
                    </div>
                    <div>
                      <span className="font-medium">Operation:</span> {selectedTask.operationName} (Op{selectedTask.operationNumber})
                    </div>
                    <div>
                      <span className="font-medium">Machine:</span> {(machines || []).find((m: Machine) => m.id === selectedTask.machine)?.name}
                    </div>
                    <div>
                      <span className="font-medium">Batch ID:</span> {selectedTask.batchId}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <Badge className={`ml-2 ${getTaskStatusColor(selectedTask.status)} text-white`}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                    {selectedTask.operator && (
                      <div>
                        <span className="font-medium">Operator:</span> {selectedTask.operator}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Batch Qty:</span> {selectedTask.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Order Qty:</span> {selectedTask.orderQty}
                      </div>
                      <div>
                        <span className="font-medium">Setup:</span> {selectedTask.setupDuration} min
                      </div>
                      <div>
                        <span className="font-medium">Run:</span> {selectedTask.runDuration} min
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-sm">
                        <div className="font-medium mb-1">Timeline:</div>
                        <div>Setup Start: {selectedTask.startTime.toLocaleString()}</div>
                        <div>Setup End: {new Date(selectedTask.startTime.getTime() + (selectedTask.setupDuration || 0) * 60000).toLocaleString()}</div>
                        <div>Run Start: {new Date(selectedTask.startTime.getTime() + (selectedTask.setupDuration || 0) * 60000).toLocaleString()}</div>
                        <div>Run End: {selectedTask.endTime.toLocaleString()}</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Total Duration:</span> {selectedTask.duration} minutes
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={closeTaskDetails}>Close</Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Gantt Chart View */}
          <TabsContent value="gantt" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Gantt Chart View
                </CardTitle>
                <p className="text-sm text-gray-600">Detailed task scheduling with dependencies</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gantt Chart View</h3>
                  <p className="text-gray-600 mb-4">Advanced Gantt chart with task dependencies coming soon</p>
                  <Button onClick={() => setActiveTab("timeline")} variant="outline">
                    View Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics View */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Machine Utilization */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-600" />
                    Machine Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(machines || []).map((machine: Machine) => (
                      <div key={machine.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{machine.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${machine.utilization}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{machine.utilization}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Task Status Overview */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Task Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">12</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium">In Progress</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">5</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium">Delayed</span>
                      </div>
                      <Badge className="bg-red-100 text-red-800">2</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">94.2%</div>
                      <div className="text-sm text-gray-600">Overall Efficiency</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">87.5%</div>
                      <div className="text-sm text-gray-600">On-Time Delivery</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">1.2h</div>
                      <div className="text-sm text-gray-600">Avg Setup Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}