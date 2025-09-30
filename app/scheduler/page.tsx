"use client"

import React, { useState, useEffect, useRef, ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
import { useRouter } from "next/navigation"
import { PartNumberService, PartNumber, samplePartNumbers } from "@/app/services/part-number-service"
import { BackendIntegrationService } from "@/app/services/backend-integration"
import { HolidayCalendar } from "@/app/components/holiday-calendar"
import { DateTimePicker } from "@/app/components/date-time-picker"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import {
  Settings,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  LogOut,
  Cog,
  Plus,
  Trash2,
  Download,
  Upload,
  BarChart3,
  RefreshCw,
  Loader2,
  Home,
  FileUp,
  Sparkles,
  FileDown,
  PieChart,
  Lock,
  Unlock,
} from "lucide-react"

interface Order {
  id: string
  partNumber: string
  operationSeq: string
  orderQuantity: number
  priority: string
  dueDate?: string
  batchMode: string
  breakdownMachine?: string
  breakdownDateTime?: string
  startDateTime?: string
  holiday?: string
  setupWindow?: string
}

interface Holiday {
  id: string
  startDateTime: string
  endDateTime: string
  reason: string
}

interface Breakdown {
  id: string
  machines: string[]
  startDateTime: string
  endDateTime: string
  reason: string
}

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("orders")
  const [orders, setOrders] = useState<Order[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

  // Part number management state
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([])
  const [partNumberSearch, setPartNumberSearch] = useState("")
  const [showPartNumberDropdown, setShowPartNumberDropdown] = useState(false)
  const [filteredPartNumbers, setFilteredPartNumbers] = useState<PartNumber[]>([])
  const [selectedPartNumber, setSelectedPartNumber] = useState<PartNumber | null>(null)
  const [loadingPartNumbers, setLoadingPartNumbers] = useState(false)
  const [backendService, setBackendService] = useState<BackendIntegrationService | null>(null)
  
  // Operation sequence dropdown states
  const [showOperationDropdown, setShowOperationDropdown] = useState(false)
  const [operationSearch, setOperationSearch] = useState('')
  const [availableOperations, setAvailableOperations] = useState<string[]>([])
  const [filteredOperations, setFilteredOperations] = useState<string[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    partNumber: "",
    operationSeq: "",
    orderQuantity: 1,
    priority: "Normal",
    dueDate: "",
    batchMode: "auto-split",
    breakdownMachine: "",
    breakdownStart: "",
    breakdownEnd: "",
    startDateTime: "",
    holidayStart: "",
    holidayEnd: "",
    setupWindow: "06:00-22:00"
  })

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    globalStartDateTime: "", // Empty by default - will use current time if not specified
    globalSetupWindow: "06:00-22:00",
    shift1: "06:00-14:00",
    shift2: "14:00-22:00",
    shift3: "22:00-06:00",
    productionWindowShift1: "06:00-14:00",
    productionWindowShift2: "14:00-22:00",
    productionWindowShift3: "22:00-06:00"
  })


  // Breakdown form state
  const [breakdownForm, setBreakdownForm] = useState({
    selectedMachines: [] as string[],
    startDateTime: "",
    endDateTime: "",
    reason: ""
  })

  // Breakdown date picker state (same as Holiday Calendar)
  const [breakdownDateRange, setBreakdownDateRange] = useState<DateRange | undefined>()
  const [breakdownStartTime, setBreakdownStartTime] = useState("")
  const [breakdownEndTime, setBreakdownEndTime] = useState("")

  // Lock state for saving settings to Supabase
  const [settingsLocked, setSettingsLocked] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)

  const { userEmail, logout } = useAuth()
  const router = useRouter()


  // Redirect if not authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/auth')
      return
    }
  }, [router])

  // Load saved advanced settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const response = await fetch('/api/save-advanced-settings', {
          method: 'GET',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const savedData = result.data.machine_data
            // Load lock state from saved data
            setSettingsLocked(savedData.is_locked || false)
            
            // Load advanced settings
            setAdvancedSettings(prev => ({
              ...prev,
              globalStartDateTime: savedData.global_start_datetime || "",
              globalSetupWindow: savedData.global_setup_window || "",
              shift1: savedData.shift_1 || "",
              shift2: savedData.shift_2 || "",
              productionShift1: savedData.production_shift_1 || "",
              productionShift2: savedData.production_shift_2 || "",
              productionShift3: savedData.production_shift_3 || "",
            }))

            // Load holidays and breakdowns
            if (savedData.holidays) {
              setHolidays(savedData.holidays)
            }
            if (savedData.breakdowns) {
              setBreakdowns(savedData.breakdowns)
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved settings:', error)
      }
    }

    if (userEmail) {
      loadSavedSettings()
    }
  }, [userEmail])

  // Initialize backend services and load part numbers on component mount
  useEffect(() => {
    initializeBackendServices()
    
    // Check if XLSX library is available
    const checkXLSX = () => {
      if (typeof window !== 'undefined') {
        console.log('XLSX library check:', typeof (window as any).XLSX)
        if (typeof (window as any).XLSX === 'undefined') {
          console.warn('XLSX library not loaded yet, retrying...')
          setTimeout(checkXLSX, 1000)
        } else {
          console.log('✅ XLSX library loaded successfully')
        }
      }
    }
    
    // Listen for XLSX loaded event
    const handleXLSXLoaded = () => {
      console.log('✅ XLSX library loaded event received')
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('xlsxLoaded', handleXLSXLoaded)
    }
    
    checkXLSX()
    
    // Cleanup event listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('xlsxLoaded', handleXLSXLoaded)
      }
    }
  }, [])

  // Initialize backend services (same as original HTML version)
  const initializeBackendServices = async () => {
    try {
      setLoadingPartNumbers(true)
      
      // Initialize backend integration service
      const backend = BackendIntegrationService.getInstance()
      await backend.initialize()
      setBackendService(backend)
      
      // Load part numbers using the backend service
      const availablePartNumbers = backend.getAvailablePartNumbers()
      
      // Convert to PartNumber format
      const partNumbersData: PartNumber[] = availablePartNumbers.map(partNumber => {
        const operations = backend.getOperationsForPart(partNumber)
        return {
          partnumber: partNumber,
          operations: operations.map(op => `OP${op.OperationSeq}`).sort()
        }
      })
      
      setPartNumbers(partNumbersData)
      console.log(`Loaded ${partNumbersData.length} part numbers from backend services`)
      
    } catch (error) {
      console.error('Failed to initialize backend services:', error)
      
      // Fallback to sample data
      setPartNumbers(samplePartNumbers)
    } finally {
      setLoadingPartNumbers(false)
    }
  }

  // Filter part numbers based on search
  useEffect(() => {
    if (partNumberSearch.trim() === '') {
      setFilteredPartNumbers(partNumbers)
    } else {
      const filtered = partNumbers.filter((part: PartNumber) => 
        part.partnumber.toLowerCase().includes(partNumberSearch.toLowerCase())
      )
      setFilteredPartNumbers(filtered)
    }
  }, [partNumberSearch, partNumbers])

  // Filter operations based on search
  useEffect(() => {
    // Always show all available operations when dropdown is opened
    // The filtering is handled by the dropdown search functionality
    setFilteredOperations(availableOperations)
  }, [availableOperations])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.part-number-dropdown')) {
        setShowPartNumberDropdown(false)
      }
      if (!target.closest('.operation-sequence-dropdown')) {
        setShowOperationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Prevent dropdown from closing when clicking inside dropdown
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }


  // Handle part number selection
  const handlePartNumberSelect = (partNumber: PartNumber) => {
    setSelectedPartNumber(partNumber)
    // Convert OP1, OP2 format to 1, 2 format for the scheduling engine
    const operationNumbers = partNumber.operations.map(op => op.replace('OP', '')).join(', ')
    setFormData((prev: any) => ({
      ...prev,
      partNumber: partNumber.partnumber,
      operationSeq: operationNumbers // Auto-fill operations in correct format
    }))
    setShowPartNumberDropdown(false)
    setPartNumberSearch(partNumber.partnumber)
    
    // Set available operations for the dropdown
    setAvailableOperations(partNumber.operations)
    setFilteredOperations(partNumber.operations)
    setOperationSearch(operationNumbers)
  }

  // Handle part number search input
  const handlePartNumberSearch = (value: string) => {
    setPartNumberSearch(value)
    setShowPartNumberDropdown(true)
    
    // Clear selected part number if search doesn't match
    if (selectedPartNumber && !value.includes(selectedPartNumber.partnumber)) {
      setSelectedPartNumber(null)
    }
  }

  // Handle manual operation sequence editing
  const handleOperationSequenceChange = (value: string) => {
    // Convert any OP1, OP2 format to 1, 2 format for consistency
    const normalizedValue = value.replace(/OP(\d+)/g, '$1')
    
    setFormData((prev: any) => ({ ...prev, operationSeq: normalizedValue }))
    setOperationSearch(normalizedValue)
    
    // Clear selected part number if operations are manually changed
    const expectedValue = selectedPartNumber ? 
      selectedPartNumber.operations.map((op: string) => op.replace('OP', '')).join(', ') : ''
    if (selectedPartNumber && normalizedValue !== expectedValue) {
      setSelectedPartNumber(null)
    }
  }

  // Handle operation sequence dropdown click
  const handleOperationSequenceClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (availableOperations.length > 0) {
      setShowOperationDropdown(!showOperationDropdown)
    }
  }

  // Handle operation sequence selection (multiple selection with toggle)
  const handleOperationSequenceSelect = (operation: string) => {
    const operationNumber = operation.replace('OP', '')
    const currentSeq = formData.operationSeq
    
    // If field is empty, just add the operation
    if (!currentSeq || currentSeq.trim() === '') {
      setFormData((prev: any) => ({ ...prev, operationSeq: operationNumber }))
      setOperationSearch(operationNumber)
    } else {
      // Check if operation is already in the sequence
      const operations = currentSeq.split(',').map((op: string) => op.trim())
      
      if (operations.includes(operationNumber)) {
        // Remove the operation if it's already selected (toggle off)
        const newOperations = operations.filter((op: string) => op !== operationNumber)
        const newSeq = newOperations.length > 0 ? newOperations.join(', ') : ''
        setFormData((prev: any) => ({ ...prev, operationSeq: newSeq }))
        setOperationSearch(newSeq)
      } else {
        // Add the operation to the existing sequence (toggle on)
        const newSeq = [...operations, operationNumber].join(', ')
        setFormData((prev: any) => ({ ...prev, operationSeq: newSeq }))
        setOperationSearch(newSeq)
      }
    }
    
    // Keep dropdown open for multiple selections
    // setShowOperationDropdown(false) // Removed to keep dropdown open
  }

  const handleAddOrder = () => {
    if (!formData.partNumber || !formData.operationSeq || !formData.orderQuantity) {
      return
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      partNumber: formData.partNumber,
      operationSeq: formData.operationSeq,
      orderQuantity: formData.orderQuantity,
      priority: formData.priority,
      dueDate: formData.dueDate || undefined,
      batchMode: formData.batchMode,
      breakdownMachine: formData.breakdownMachine || undefined,
      breakdownDateTime: formData.breakdownStart && formData.breakdownEnd 
        ? `${formData.breakdownStart} - ${formData.breakdownEnd}` : undefined,
      startDateTime: formData.startDateTime || undefined,
      holiday: formData.holidayStart && formData.holidayEnd 
        ? `${formData.holidayStart} - ${formData.holidayEnd}` : undefined,
      setupWindow: formData.setupWindow || undefined
    }

    setOrders((prev: Order[]) => [...prev, newOrder])
    
    // Reset form
    setFormData({
      partNumber: "",
      operationSeq: "",
      orderQuantity: 1,
      priority: "Normal",
      dueDate: "",
      batchMode: "auto-split",
      breakdownMachine: "",
      breakdownStart: "",
      breakdownEnd: "",
      startDateTime: "",
      holidayStart: "",
      holidayEnd: "",
      setupWindow: "06:00-22:00"
    })
  }

  const handleDeleteOrder = (id: string) => {
    setOrders((prev: Order[]) => prev.filter((order: Order) => order.id !== id))
  }

  const handleClearForm = () => {
    setFormData({
      partNumber: "",
      operationSeq: "",
      orderQuantity: 1,
      priority: "Normal",
      dueDate: "",
      batchMode: "auto-split",
      breakdownMachine: "",
      breakdownStart: "",
      breakdownEnd: "",
      startDateTime: "",
      holidayStart: "",
      holidayEnd: "",
      setupWindow: "06:00-22:00"
    })
    setSelectedPartNumber(null)
    setPartNumberSearch("")
    setShowPartNumberDropdown(false)
    setShowOperationDropdown(false)
    setOperationSearch("")
    setAvailableOperations([])
    setFilteredOperations([])
  }

  const handleClearAllOrders = () => {
    setOrders([])
  }

  const handleAddHoliday = (holidayData: { startDateTime: string; endDateTime: string; reason: string }) => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      startDateTime: holidayData.startDateTime,
      endDateTime: holidayData.endDateTime,
      reason: holidayData.reason || "Holiday"
    }

    setHolidays((prev: Holiday[]) => [...prev, newHoliday])
  }

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev: Holiday[]) => prev.filter((holiday: Holiday) => holiday.id !== id))
  }

  const handleAddBreakdown = () => {
    if (!breakdownForm.selectedMachines.length || !breakdownDateRange?.from || !breakdownDateRange?.to || !breakdownStartTime || !breakdownEndTime) {
      alert("Please select machines, date range, and time range")
      return
    }

    // Combine date and time
    const startDateTime = `${format(breakdownDateRange.from, 'yyyy-MM-dd')}T${breakdownStartTime}`
    const endDateTime = `${format(breakdownDateRange.to, 'yyyy-MM-dd')}T${breakdownEndTime}`

    const newBreakdown: Breakdown = {
      id: Date.now().toString(),
      machines: breakdownForm.selectedMachines,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      reason: breakdownForm.reason || "Maintenance"
    }

    setBreakdowns((prev: Breakdown[]) => [...prev, newBreakdown])
    setBreakdownForm({ selectedMachines: [], startDateTime: "", endDateTime: "", reason: "" })
    setBreakdownDateRange(undefined)
    setBreakdownStartTime("")
    setBreakdownEndTime("")
  }

  const handleDeleteBreakdown = (id: string) => {
    setBreakdowns((prev: Breakdown[]) => prev.filter((breakdown: Breakdown) => breakdown.id !== id))
  }


  // Handle lock/unlock settings to Supabase
  const handleToggleSettingsLock = async () => {
    try {
      if (settingsLocked) {
        // UNLOCK: Send unlock request to API
        const unlockData = {
          user_email: userEmail,
          is_locked: false
        }

        const response = await fetch('/api/save-advanced-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': userEmail || 'default@user.com',
          },
          body: JSON.stringify(unlockData)
        })

        if (response.ok) {
          setSettingsLocked(false)
        } else {
          throw new Error('Failed to unlock settings')
        }
      } else {
        // LOCK: Save to Supabase with lock state
        const settingsData = {
          user_email: userEmail,
          global_start_datetime: advancedSettings.globalStartDateTime,
          global_setup_window: advancedSettings.globalSetupWindow,
          shift_1: advancedSettings.shift1,
          shift_2: advancedSettings.shift2,
          production_shift_1: advancedSettings.productionWindowShift1,
          production_shift_2: advancedSettings.productionWindowShift2,
          production_shift_3: advancedSettings.productionWindowShift3,
          holidays: holidays,
          breakdowns: breakdowns,
          is_locked: true, // Lock state
          locked_at: new Date().toISOString(),
          role: 'operator'
        }

        const response = await fetch('/api/save-advanced-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': userEmail || 'default@user.com',
          },
          body: JSON.stringify(settingsData)
        })

        if (response.ok) {
          setSettingsLocked(true)
        } else {
          throw new Error('Failed to lock settings')
        }
      }
    } catch (error) {
      console.error('Error toggling settings lock:', error)
      alert('Failed to toggle settings lock. Please try again.')
    }
  }

  const handleMachineToggle = (machine: string) => {
    setBreakdownForm((prev: any) => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(machine)
        ? prev.selectedMachines.filter((m: string) => m !== machine)
        : [...prev.selectedMachines, machine]
    }))
  }

  const handleRunSchedule = async () => {
    if (orders.length === 0 || !backendService) return

    setLoading(true)
    setShowResults(false)

    try {
      // Use current time if no start date/time is specified
      const startDateTime = advancedSettings.globalStartDateTime || (() => {
        const now = new Date()
        // Use actual current time, not forced to 6:00 AM
        console.log('Using current time for scheduling:', now.toISOString().slice(0, 16))
        return now.toISOString().slice(0, 16)
      })()
      
      console.log('Final startDateTime being passed to backend:', startDateTime)
      
      // Use the backend scheduling engine (same as original HTML version)
      const scheduleResults = await backendService.runSchedule(orders, {
        globalStartDateTime: startDateTime,
        globalSetupWindow: advancedSettings.globalSetupWindow,
        shift1: advancedSettings.shift1,
        shift2: advancedSettings.shift2,
        shift3: advancedSettings.shift3,
        productionWindowShift1: advancedSettings.productionWindowShift1,
        productionWindowShift2: advancedSettings.productionWindowShift2,
        productionWindowShift3: advancedSettings.productionWindowShift3,
        holidays: holidays,
        breakdowns: breakdowns
      })
      
      console.log('Raw scheduling results from backend:', scheduleResults)
      console.log('First result sample:', scheduleResults[0])
      setResults(scheduleResults)
      setShowResults(true)
    } catch (error) {
      console.error('Error running schedule:', error)
      // Fallback to mock results
      const mockResults = orders.map((order: Order, index: number) => ({
        id: order.id,
        partNumber: order.partNumber,
        orderQty: order.orderQuantity,
        priority: order.priority,
        batchId: `B${index + 1}`,
        batchQty: Math.ceil(order.orderQuantity / 2),
        operationSeq: order.operationSeq,
        operationName: `Operation ${order.operationSeq}`,
        machine: `VMC ${(index % 6) + 1}`,
        person: `Operator ${(index % 3) + 1}`,
        setupStart: new Date(Date.now() + index * 3600000).toISOString(),
        setupEnd: new Date(Date.now() + index * 3600000 + 1800000).toISOString(),
        runStart: new Date(Date.now() + index * 3600000 + 1800000).toISOString(),
        runEnd: new Date(Date.now() + index * 3600000 + 3600000).toISOString(),
        timing: "2.5h",
        dueDate: order.dueDate || "N/A",
        status: index % 3 === 0 ? "Scheduled" : "Completed"
      }))
      
      setResults(mockResults)
      setShowResults(true)
    } finally {
      setLoading(false)
    }
  }

  // Floating Action Bar Handlers
  const handleShowDashboard = () => {
    router.push('/schedule-dashboard')
  }

  const handleImportExcel = () => {
    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        // Handle Excel import logic here
        console.log('Importing Excel file:', file.name)
        // You can add actual Excel parsing logic here
      }
    }
    input.click()
  }

  const handleExportExcel = async () => {
    if (results.length === 0) {
      alert('No results to export. Please run the schedule first.')
      return
    }
    
    try {
      // Check if Excel exporter is available
      console.log('Checking Excel exporter availability...')
      console.log('window.ExcelExporter:', typeof window !== 'undefined' ? (window as any).ExcelExporter : 'undefined')
      console.log('window.exportToExcel:', typeof window !== 'undefined' ? (window as any).exportToExcel : 'undefined')
      console.log('window.XLSX:', typeof window !== 'undefined' ? (window as any).XLSX : 'undefined')
      
      // Check if XLSX library is available
      if (typeof window !== 'undefined' && typeof (window as any).XLSX === 'undefined') {
        throw new Error('XLSX library not loaded. Please refresh the page and try again.')
      }
      
      if (typeof window !== 'undefined' && (window as any).ExcelExporter) {
        // Format results for Excel export compatibility
        const scheduleData = {
          rows: results.map((result: any) => ({
            PartNumber: result.partNumber,
            Order_Quantity: result.orderQty,
            Priority: result.priority,
            Batch_ID: result.batchId,
            Batch_Qty: result.batchQty,
            OperationSeq: result.operationSeq,
            OperationName: result.operationName,
            Machine: result.machine,
            Person: result.person,
            SetupStart: result.setupStart,
            SetupEnd: result.setupEnd,
            RunStart: result.runStart,
            RunEnd: result.runEnd,
            Timing: result.timing,
            DueDate: result.dueDate,
            Status: result.status
          }))
        }
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const filename = `production_schedule_${timestamp}.xlsx`
        
        // Export to Excel
        const result = (window as any).exportToExcel(scheduleData, filename)
        
        if (result.success) {
          console.log('✅ Excel file exported successfully:', result.filename)
        } else {
          console.error('❌ Excel export failed:', result.error)
          alert('Failed to export Excel file: ' + result.error)
        }
      } else {
        // Fallback to CSV if Excel exporter not available
        console.warn('Excel exporter not available, falling back to CSV export')
        
        const headers = ['Part Number', 'Order Qty', 'Priority', 'Batch ID', 'Batch Qty', 'Operation Seq', 'Operation Name', 'Machine', 'Person', 'Setup Start', 'Setup End', 'Run Start', 'Run End', 'Timing', 'Due Date', 'Status']
        const csvContent = [
          headers.join(','),
          ...results.map((result: any) => [
            result.partNumber,
            result.orderQty,
            result.priority,
            result.batchId,
            result.batchQty,
            result.operationSeq,
            result.operationName,
            result.machine,
            result.person,
            new Date(result.setupStart).toLocaleString(),
            new Date(result.setupEnd).toLocaleString(),
            new Date(result.runStart).toLocaleString(),
            new Date(result.runEnd).toLocaleString(),
            result.timing,
            result.dueDate,
            result.status
          ].join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `schedule-results-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export file: ' + (error as Error).message)
    }
  }

  const handleShowChart = async () => {
    if (!showResults || results.length === 0) {
      alert('Please run the schedule first to see the chart.')
      return
    }

    try {
      // Calculate timeline starting from current time
      const now = new Date()
      let currentTime = new Date(now.getTime())
      
      // Prepare chart data from scheduling results with proper timeline calculation
      const chartTasks = results.map((result: any, index: number) => {
        // Calculate setup start time (current time)
        const setupStartTime = new Date(currentTime.getTime())
        
        // Calculate setup end time (setup start + setup duration)
        const setupDuration = 90 * 60 * 1000 // 90 minutes in milliseconds
        const setupEndTime = new Date(setupStartTime.getTime() + setupDuration)
        
        // Calculate run start time (setup end time)
        const runStartTime = new Date(setupEndTime.getTime())
        
        // Calculate run end time (run start + run duration)
        const runDuration = result.timing ? parseInt(result.timing.replace(/[^\d]/g, '')) * 60 * 1000 : 480 * 60 * 1000 // Convert to milliseconds
        const runEndTime = new Date(runStartTime.getTime() + runDuration)
        
        // Update current time for next task (add some buffer between tasks)
        currentTime = new Date(runEndTime.getTime() + (30 * 60 * 1000)) // 30 minute buffer
        
        // Debug: Log the actual result structure
        console.log('Scheduling result:', result)
        
        return {
          id: `${result.partNumber || result.partnumber || 'PN'}-${result.batchId || result.batch_id || 'B'}-Op${result.operationSeq || result.operation_seq || index}`,
          name: `${result.partNumber || result.partnumber || 'PN'}-${result.batchId || result.batch_id || 'B'}-Op${result.operationSeq || result.operation_seq || index}`,
          machine: result.machine?.toLowerCase().replace(/\s+/g, '') || 'vmc1',
          startTime: setupStartTime,
          endTime: runEndTime,
          duration: result.timing ? parseInt(result.timing.replace(/[^\d]/g, '')) * 60 : 480,
          status: result.status?.toLowerCase() === 'completed' ? 'completed' : 
                 result.status?.toLowerCase() === 'in progress' ? 'in-progress' : 'not-started',
          operator: result.person || result.operator || 'A',
          partNumber: result.partNumber || result.partnumber || 'PN',
          batchId: result.batchId || result.batch_id || 'B',
          operationNumber: result.operationSeq || result.operation_seq || index.toString(),
          operationName: result.operationName || result.operation_name || 'Operation',
          quantity: result.batchQty || result.batch_qty || 100,
          orderQty: result.orderQty || result.order_quantity || result.order_qty || 100,
          setupDuration: 90, // Default setup time
          runDuration: result.timing ? Math.max(parseInt(result.timing.replace(/[^\d]/g, '')) * 60 - 90, 30) : 390,
          priority: result.priority?.toLowerCase() || 'medium',
          isSetup: false
        }
      })

      // Store chart data directly to Supabase cloud
      const chartData = {
        sessionId: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        timelineView: 'day',
        chartData: {
          tasks: chartTasks,
          currentTime: new Date().toISOString(),
          scrollPosition: 0
        },
        machineData: {
          machines: [
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
          ]
        }
      }

      // Store exact scheduling results to dedicated table
      const schedulingResponse = await fetch('/api/store-scheduling-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedulingResults: results // Store the exact scheduling output data
        })
      })

      if (!schedulingResponse.ok) {
        console.warn('Failed to store scheduling results to dedicated table')
      }

      // Store to Supabase cloud via API with complete scheduling results
      const response = await fetch('/api/store-chart-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...chartData,
          schedulingResults: results // Include the complete scheduling results
        })
      })

      if (response.ok) {
        console.log('Chart data and scheduling results stored to Supabase cloud successfully')
        // Navigate to chart page
        router.push('/chart')
      } else {
        throw new Error('Failed to store chart data to cloud')
      }

    } catch (error) {
      console.error('Error storing chart data to cloud:', error)
      alert('Failed to store chart data to cloud. Please try again.')
    }
  }

  const handleClearSession = () => {
    if (confirm('Are you sure you want to clear all current data? This will remove all orders and results, but preserve locked advanced settings.')) {
      setOrders([])
      setResults([])
      setShowResults(false)
      setFormData({
        partNumber: "",
        operationSeq: "",
        orderQuantity: 1,
        priority: "Normal",
        dueDate: "",
        batchMode: "auto-split",
        breakdownMachine: "",
        breakdownStart: "",
        breakdownEnd: "",
        startDateTime: "",
        holidayStart: "",
        holidayEnd: "",
        setupWindow: "06:00-22:00"
      })
      setSelectedPartNumber(null)
      setPartNumberSearch("")
      setShowPartNumberDropdown(false)
      setShowOperationDropdown(false)
      setOperationSearch("")
      setAvailableOperations([])
      setFilteredOperations([])
      
      // Only clear advanced settings if they are NOT locked
      if (!settingsLocked) {
        setHolidays([])
        setBreakdowns([])
        setAdvancedSettings({
          globalStartDateTime: "",
          globalSetupWindow: "",
          shift1: "",
          shift2: "",
          shift3: "",
          productionWindowShift1: "",
          productionWindowShift2: "",
          productionWindowShift3: ""
        })
      } else {
        alert('Advanced settings are locked and will be preserved. Unlock them first if you want to clear all data.')
      }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-red-100 text-red-800 border-red-200"
      case "High": return "bg-orange-100 text-orange-800 border-orange-200"
      case "Normal": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Premium Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img 
                    src="/Epsilologo.svg" 
                    alt="Epsilon Logo" 
                    className="w-10 h-10"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Production Scheduler</h1>
                  <p className="text-sm text-gray-600">Advanced Manufacturing Scheduling System</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500">Welcome, {userEmail}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                System Online
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                <img 
                  src="/Epsilologo.svg" 
                  alt="Epsilon Logo" 
                  className="w-4 h-4 mr-2"
                />
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Order Management</CardTitle>
                <CardDescription>Add and manage production orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mandatory Fields */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Mandatory Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2 relative part-number-dropdown">
                          <Label htmlFor="partNumber">Part Number</Label>
                          <div className="relative">
                            <Input
                              id="partNumber"
                              value={partNumberSearch}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                handlePartNumberSearch(e.target.value)
                                handleInputChange("partNumber", e.target.value)
                              }}
                              onFocus={() => setShowPartNumberDropdown(true)}
                              placeholder="Search part numbers..."
                              className="border-gray-200 focus:border-blue-500"
                            />
                            {loadingPartNumbers && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Part Number Dropdown */}
                          {showPartNumberDropdown && filteredPartNumbers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredPartNumbers.map((part: PartNumber, index: number) => (
                                <div
                                  key={`${part.partnumber}-${index}`}
                                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => handlePartNumberSelect(part)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-gray-900">{part.partnumber}</div>
                                    <div className="text-xs text-gray-400">
                                      {part.operations.length} ops
                                    </div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {part.operations.slice(0, 3).map((op: string, opIndex: number) => (
                                      <Badge key={opIndex} variant="outline" className="text-xs">
                                        {op}
                                      </Badge>
                                    ))}
                                    {part.operations.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{part.operations.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    
                    <div className="space-y-2 relative operation-sequence-dropdown">
                      <Label htmlFor="operationSeq">Operation Sequence</Label>
                      <div className="relative">
                        <Input
                          id="operationSeq"
                          value={formData.operationSeq}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleOperationSequenceChange(e.target.value)}
                          onClick={handleOperationSequenceClick}
                          placeholder={availableOperations.length > 0 ? "Click to select operations" : "Select a part number first"}
                          className="border-gray-200 focus:border-blue-500 cursor-pointer"
                          readOnly={availableOperations.length === 0}
                          autoComplete="off"
                        />
                        {availableOperations.length > 0 && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        )}
                        {selectedPartNumber && (
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Auto-filled
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Operation Sequence Dropdown - Frappe UI Style */}
                      {showOperationDropdown && availableOperations.length > 0 && (
                        <div 
                          className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                          onClick={handleDropdownClick}
                        >
                          <div className="p-2">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 px-2">
                              <div className="text-sm font-medium text-gray-700">
                                Select Operations
                              </div>
                              <button
                                onClick={() => setShowOperationDropdown(false)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                Done
                              </button>
                            </div>
                            
                            {/* Operations List */}
                            <div className="space-y-1">
                              {filteredOperations.map((operation: string, index: number) => {
                                const operationNumber = operation.replace('OP', '')
                                const isSelected = formData.operationSeq.split(',').map((op: string) => op.trim()).includes(operationNumber)
                                
                                return (
                                  <div
                                    key={`${operation}-${index}`}
                                    className={`px-3 py-2 cursor-pointer rounded transition-colors ${
                                      isSelected 
                                        ? 'bg-gray-200' 
                                        : 'hover:bg-gray-100'
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleOperationSequenceSelect(operation)
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Simple Checkbox */}
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        isSelected 
                                          ? 'bg-gray-400 border-gray-400' 
                                          : 'border-gray-300'
                                      }`}>
                                        {isSelected && (
                                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                                        )}
                                      </div>
                                      
                                      {/* Operation Info */}
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {operation}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Operation {operationNumber}
                                        </div>
                                      </div>
                                      
                                      {/* Operation Number */}
                                      <div className="text-xs text-gray-500">
                                        {operationNumber}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {filteredOperations.length === 0 && (
                              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                No operations found
                              </div>
                            )}
                            
                            {/* Footer with Select All */}
                            {filteredOperations.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    const allOperations = filteredOperations.map((op: string) => op.replace('OP', '')).join(', ')
                                    setFormData((prev: any) => ({ ...prev, operationSeq: allOperations }))
                                    setOperationSearch(allOperations)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors"
                                >
                                  Select All
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {availableOperations.length === 0 && (
                        <p className="text-xs text-gray-500">
                          Select a part number first to see available operations
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Urgent"
                            checked={formData.priority === "Urgent"}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("priority", e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-red-600">🔴 Urgent</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="High"
                            checked={formData.priority === "High"}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("priority", e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-orange-600">🟠 High</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Normal"
                            checked={formData.priority === "Normal"}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("priority", e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-yellow-600">🟡 Normal</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Low"
                            checked={formData.priority === "Low"}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("priority", e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-green-600">🟢 Low</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date (Optional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("dueDate", e.target.value)}
                        placeholder="mm/dd/yyyy"
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="orderQuantity">Order Quantity</Label>
                      <Input
                        id="orderQuantity"
                        type="number"
                        min="1"
                        value={formData.orderQuantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange("orderQuantity", parseInt(e.target.value))}
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Batch Mode Switch</Label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange("batchMode", "single-batch")}
                          className={`px-3 py-1 rounded ${formData.batchMode === "single-batch" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange("batchMode", "auto-split")}
                          className={`px-3 py-1 rounded ${formData.batchMode === "auto-split" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                        >
                          ⭕ Auto-Split
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange("batchMode", "custom-batch-size")}
                          className={`px-3 py-1 rounded ${formData.batchMode === "custom-batch-size" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleAddOrder} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    ➕ Add Order
                  </Button>
                  <Button onClick={handleClearForm} variant="outline">
                    🗑️ Clear Form
                  </Button>
                  <Button 
                    onClick={handleRunSchedule} 
                    disabled={orders.length === 0 || loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run Schedule
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl text-gray-900">📋 Saved Orders</CardTitle>
                    <CardDescription>Manage your production orders</CardDescription>
                  </div>
                  <Button onClick={handleClearAllOrders} variant="outline" size="sm">
                    All Clear ❌
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No orders added yet</p>
                    <p className="text-sm">Add your first order above to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Part Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Operation Seq</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Order Quantity</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Priority</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Due Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch Mode</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Breakdown Machine</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Breakdown DateTime</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Start DateTime</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Holiday</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Setup Window</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order: Order) => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{order.partNumber}</td>
                            <td className="py-3 px-4 text-gray-600">{order.operationSeq}</td>
                            <td className="py-3 px-4 text-gray-600">{order.orderQuantity}</td>
                            <td className="py-3 px-4">
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {order.dueDate || "Not set"}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{order.batchMode}</td>
                            <td className="py-3 px-4 text-gray-600">{order.breakdownMachine || "N/A"}</td>
                            <td className="py-3 px-4 text-gray-600">{order.breakdownDateTime || "N/A"}</td>
                            <td className="py-3 px-4 text-gray-600">{order.startDateTime || "N/A"}</td>
                            <td className="py-3 px-4 text-gray-600">{order.holiday || "N/A"}</td>
                            <td className="py-3 px-4 text-gray-600">{order.setupWindow || "N/A"}</td>
                            <td className="py-3 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Results */}
            {showResults && (
              <Card id="schedule-results" className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">📊 Schedule Results</CardTitle>
                  <CardDescription>Generated production schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Part Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Order Qty</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Priority</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch Qty</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Operation Seq</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Operation Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Machine</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Person</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Setup Start</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Setup End</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Run Start</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Run End</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Timing</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Due Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result: any) => (
                          <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{result.partNumber}</td>
                            <td className="py-3 px-4 text-gray-600">{result.orderQty}</td>
                            <td className="py-3 px-4">
                              <Badge className={getPriorityColor(result.priority)}>
                                {result.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{result.batchId}</td>
                            <td className="py-3 px-4 text-gray-600">{result.batchQty}</td>
                            <td className="py-3 px-4 text-gray-600">{result.operationSeq}</td>
                            <td className="py-3 px-4 text-gray-600">{result.operationName}</td>
                            <td className="py-3 px-4 text-gray-600">{result.machine}</td>
                            <td className="py-3 px-4 text-gray-600">{result.person}</td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(result.setupStart).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(result.setupEnd).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(result.runStart).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(result.runEnd).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{result.timing}</td>
                            <td className="py-3 px-4 text-gray-600">{result.dueDate}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                {result.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                    <Button variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Chart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            {/* Global Advanced Settings */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900">⚙️ Global Advanced Settings</CardTitle>
                    <CardDescription>Configure global scheduling parameters</CardDescription>
                  </div>
                  <button
                    onClick={handleToggleSettingsLock}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      settingsLocked 
                        ? "bg-transparent border-gray-400 text-gray-600 hover:border-gray-500" 
                        : "bg-transparent border-gray-300 text-gray-500 hover:border-gray-400"
                    }`}
                    title={settingsLocked ? "Click to unlock and edit settings" : "Click to lock and save settings"}
                  >
                    {settingsLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Unlock className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="globalStartDateTime">Global Start Date & Time (Master Clock)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="globalStartDateTime"
                          type="datetime-local"
                          value={advancedSettings.globalStartDateTime}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            setAdvancedSettings((prev: any) => ({ ...prev, globalStartDateTime: e.target.value }))
                          }
                          placeholder="mm/dd/yyyy, --:-- --"
                          className="border-gray-200 focus:border-blue-500 flex-1"
                          disabled={settingsLocked}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = new Date()
                            // Use actual current time, not forced to 6:00 AM
                            setAdvancedSettings((prev: any) => ({ 
                              ...prev, 
                              globalStartDateTime: now.toISOString().slice(0, 16) 
                            }))
                          }}
                          className="whitespace-nowrap"
                          disabled={settingsLocked}
                        >
                          Now
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Sets the master clock for when scheduling begins. Leave empty to use current date and time automatically.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="globalSetupWindow">Global Setup Window (People-Dependent)</Label>
                      <Input
                        id="globalSetupWindow"
                        value={advancedSettings.globalSetupWindow}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, globalSetupWindow: e.target.value }))
                        }
                        placeholder="06:00-22:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                      <p className="text-xs text-gray-500">
                        Format: HH:MM-HH:MM. Auto-filled from Shift 1 and Shift 2 below (earliest start to latest end). You can still override manually.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift1">Shift 1 (Controls Global Setup Window)</Label>
                      <Input
                        id="shift1"
                        value={advancedSettings.shift1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, shift1: e.target.value }))
                        }
                        placeholder="06:00-14:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shift2">Shift 2 (Controls Global Setup Window)</Label>
                      <Input
                        id="shift2"
                        value={advancedSettings.shift2}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, shift2: e.target.value }))
                        }
                        placeholder="14:00-22:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Window (Machine-Dependent)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodShift1">Shift 1 (Morning)</Label>
                      <Input
                        id="prodShift1"
                        value={advancedSettings.productionWindowShift1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, productionWindowShift1: e.target.value }))
                        }
                        placeholder="06:00-14:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodShift2">Shift 2 (Afternoon)</Label>
                      <Input
                        id="prodShift2"
                        value={advancedSettings.productionWindowShift2}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, productionWindowShift2: e.target.value }))
                        }
                        placeholder="14:00-22:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodShift3">Shift 3 (Night)</Label>
                      <Input
                        id="prodShift3"
                        value={advancedSettings.productionWindowShift3}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setAdvancedSettings((prev: any) => ({ ...prev, productionWindowShift3: e.target.value }))
                        }
                        placeholder="22:00-06:00"
                        className="border-gray-200 focus:border-blue-500"
                        disabled={settingsLocked}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Holiday Calendar and Machine Breakdowns - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Holiday Calendar - Left Side */}
              <div className="space-y-4 h-full">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-1 rounded-lg">
                  <HolidayCalendar
                    holidays={holidays}
                    onAddHoliday={handleAddHoliday}
                    onDeleteHoliday={handleDeleteHoliday}
                    disabled={settingsLocked}
                  />
                </div>
              </div>

              {/* Machine Breakdowns - Right Side */}
              <div className="space-y-4 h-full">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-1 rounded-lg">
                  <Card className="bg-white border border-gray-200 shadow-sm h-full">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Machine Breakdowns (Downtime Control)
                    </CardTitle>
                    <CardDescription>Manage machine downtime and maintenance schedules</CardDescription>
                  </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Select Machines</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <label key={i} className="flex items-center space-x-1 p-1 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={breakdownForm.selectedMachines.includes(`VMC ${i + 1}`)}
                            onChange={() => handleMachineToggle(`VMC ${i + 1}`)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={settingsLocked}
                          />
                          <span className="text-xs font-medium text-gray-700">VMC {i + 1}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date & Time Range Picker - Same as Holiday Calendar */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Select Breakdown Period</Label>
                    
                    <DateTimePicker
                      dateRange={breakdownDateRange}
                      onDateRangeChange={setBreakdownDateRange}
                      startTime={breakdownStartTime}
                      onStartTimeChange={setBreakdownStartTime}
                      endTime={breakdownEndTime}
                      onEndTimeChange={setBreakdownEndTime}
                      placeholder="Pick start and end dates with times"
                      disabled={settingsLocked}
                      onSelect={() => {
                        // Optional: You can add any logic here when user clicks Select
                        console.log('Breakdown date/time selected:', { 
                          breakdownDateRange, 
                          breakdownStartTime, 
                          breakdownEndTime 
                        })
                      }}
                    />
                    
                    <div className="space-y-2">
                      <Label htmlFor="breakdownReason" className="text-sm font-medium text-gray-700">Reason (Optional)</Label>
                      <Input
                        id="breakdownReason"
                        value={breakdownForm.reason}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setBreakdownForm((prev: any) => ({ ...prev, reason: e.target.value }))
                        }
                        placeholder="e.g., Maintenance, Repair"
                        className="border-gray-200 focus:border-orange-500 text-sm"
                        disabled={settingsLocked}
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleAddBreakdown} 
                  className="bg-orange-600 hover:bg-orange-700" 
                  disabled={settingsLocked}
                >
                  🔧 Add Breakdown
                </Button>

                {/* Saved Breakdowns */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Saved Machine Breakdowns
                    <Badge variant="secondary" className="ml-2">
                      {breakdowns.length} breakdowns
                    </Badge>
                  </h3>
                  
                  {breakdowns.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                      <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">No breakdowns added yet</p>
                      <p className="text-gray-400 text-sm">Add machine breakdown periods to schedule maintenance downtime</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {breakdowns.map((breakdown: Breakdown) => (
                        <div key={breakdown.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {new Date(breakdown.startDateTime).toLocaleDateString()}
                                </Badge>
                                <span className="text-gray-400">to</span>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(breakdown.endDateTime).toLocaleDateString()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {new Date(breakdown.startDateTime).toLocaleTimeString()} - {new Date(breakdown.endDateTime).toLocaleTimeString()}
                              </p>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{breakdown.reason}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {breakdown.machines.map((machine, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {machine}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBreakdown(breakdown.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                              disabled={settingsLocked}
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </div>
              </div>
            </div>

            {/* Save/Load Settings */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    💾 Save Settings
                  </Button>
                  <Button variant="outline">
                    📂 Load Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3">
            {/* Dashboard Button */}
            <Button
              onClick={handleShowDashboard}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Dashboard"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {/* Import Excel Button */}
            <Button
              onClick={handleImportExcel}
              className="bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Import Excel"
            >
              <FileUp className="w-4 h-4 mr-2" />
               Import Excel
            </Button>

            {/* Schedule Generate Button */}
            <Button
              onClick={handleRunSchedule}
              disabled={orders.length === 0 || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-full px-6 py-2 relative overflow-hidden transition-all duration-200 hover:scale-105"
              title="Schedule Generate"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Schedule Generate</span>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </Button>

            {/* Export Excel Button */}
            <Button
              onClick={handleExportExcel}
              disabled={results.length === 0}
              className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600 rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              title={results.length === 0 ? "Export Excel (No results available)" : "Export Excel"}
            >
              <FileDown className="w-4 h-4 mr-2" />
               Export Excel
            </Button>

            {/* Chart Button */}
            <Button
              onClick={handleShowChart}
              className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Chart"
            >
              <PieChart className="w-4 h-4 mr-2" />
               Chart
            </Button>

            {/* Clear Session Button */}
            <Button
              onClick={handleClearSession}
              className="bg-red-600 hover:bg-red-700 text-white border-red-500 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Clear Session"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
               Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
