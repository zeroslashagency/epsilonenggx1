'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Download, Users } from 'lucide-react'
import { ZohoButton } from './zoho-ui'

interface DateRange {
  startDate: string
  endDate: string
  label: string
}

interface Employee {
  employee_code: string
  employee_name: string
}

interface ExportOptions {
  dateRange: DateRange
  selectedEmployees: string[] // Array of employee codes to include
  exportType: 'all' | 'selected'
}

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void
  onExport: (options: ExportOptions) => void
  currentRange?: DateRange
  employees?: Employee[] // List of available employees
}

export default function DateRangePicker({ onDateRangeChange, onExport, currentRange, employees = [] }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<DateRange>(
    currentRange || {
      startDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      label: 'Last 14 Days'
    }
  )
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false)
  const [exportType, setExportType] = useState<'all' | 'selected'>('selected')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-select all employees when employees list is loaded
  useEffect(() => {
    if (employees.length > 0 && selectedEmployees.length === 0) {
      setSelectedEmployees(employees.map(emp => emp.employee_code))
    }
  }, [employees])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCustom(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDateRange = (type: string): DateRange => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    switch (type) {
      case 'today':
        return {
          startDate: startOfToday.toISOString().split('T')[0],
          endDate: startOfToday.toISOString().split('T')[0],
          label: 'Today'
        }
      
      case 'yesterday':
        const yesterday = new Date(startOfToday)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0],
          label: 'Yesterday'
        }
      
      case 'thisWeek':
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: startOfToday.toISOString().split('T')[0],
          label: 'This Week'
        }
      
      case 'previousWeek':
        const prevWeekEnd = new Date(startOfToday)
        prevWeekEnd.setDate(startOfToday.getDate() - startOfToday.getDay() - 1)
        const prevWeekStart = new Date(prevWeekEnd)
        prevWeekStart.setDate(prevWeekEnd.getDate() - 6)
        return {
          startDate: prevWeekStart.toISOString().split('T')[0],
          endDate: prevWeekEnd.toISOString().split('T')[0],
          label: 'Previous Week'
        }
      
      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: startOfToday.toISOString().split('T')[0],
          label: 'This Month'
        }
      
      case 'previousMonth':
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        return {
          startDate: prevMonth.toISOString().split('T')[0],
          endDate: prevMonthEnd.toISOString().split('T')[0],
          label: 'Previous Month'
        }
      
      case 'thisQuarter':
        const currentQuarter = Math.floor(today.getMonth() / 3)
        const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1)
        // Use local date formatting to avoid timezone issues
        const quarterStartStr = quarterStart.getFullYear() + '-' + 
          String(quarterStart.getMonth() + 1).padStart(2, '0') + '-' + 
          String(quarterStart.getDate()).padStart(2, '0')
        return {
          startDate: quarterStartStr,
          endDate: startOfToday.toISOString().split('T')[0],
          label: 'This Quarter'
        }
      
      case 'previousQuarter':
        const prevQuarter = Math.floor(today.getMonth() / 3) - 1
        const prevQuarterYear = prevQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear()
        const prevQuarterMonth = prevQuarter < 0 ? 9 : prevQuarter * 3 // Q4 starts at month 9 (Oct)
        const prevQuarterStart = new Date(prevQuarterYear, prevQuarterMonth, 1)
        const prevQuarterEnd = new Date(prevQuarterYear, prevQuarterMonth + 3, 0) // Last day of quarter
        // Use local date formatting to avoid timezone issues
        const prevQuarterStartStr = prevQuarterStart.getFullYear() + '-' + 
          String(prevQuarterStart.getMonth() + 1).padStart(2, '0') + '-' + 
          String(prevQuarterStart.getDate()).padStart(2, '0')
        const prevQuarterEndStr = prevQuarterEnd.getFullYear() + '-' + 
          String(prevQuarterEnd.getMonth() + 1).padStart(2, '0') + '-' + 
          String(prevQuarterEnd.getDate()).padStart(2, '0')
        return {
          startDate: prevQuarterStartStr,
          endDate: prevQuarterEndStr,
          label: 'Previous Quarter'
        }
      
      case 'thisYear':
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return {
          startDate: startOfYear.toISOString().split('T')[0],
          endDate: startOfToday.toISOString().split('T')[0],
          label: 'This Year'
        }
      
      case 'previousYear':
        const prevYearStart = new Date(today.getFullYear() - 1, 0, 1)
        const prevYearEnd = new Date(today.getFullYear() - 1, 11, 31)
        return {
          startDate: prevYearStart.toISOString().split('T')[0],
          endDate: prevYearEnd.toISOString().split('T')[0],
          label: 'Previous Year'
        }
      
      default:
        return selectedRange
    }
  }

  const handleRangeSelect = (type: string) => {
    if (type === 'custom') {
      setShowCustom(true)
      return
    }
    
    const range = getDateRange(type)
    setSelectedRange(range)
    onDateRangeChange(range)
    setIsOpen(false)
    setShowCustom(false)
  }

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const range: DateRange = {
        startDate: customStartDate,
        endDate: customEndDate,
        label: 'Custom Range'
      }
      setSelectedRange(range)
      onDateRangeChange(range)
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  const handleExport = () => {
    const exportOptions: ExportOptions = {
      dateRange: selectedRange,
      selectedEmployees: exportType === 'selected' ? selectedEmployees : [],
      exportType
    }
    onExport(exportOptions)
  }

  const handleEmployeeToggle = (employeeCode: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeCode) 
        ? prev.filter(code => code !== employeeCode)
        : [...prev, employeeCode]
    )
  }

  const handleSelectAll = () => {
    setSelectedEmployees(employees.map(emp => emp.employee_code))
  }

  const handleClearAll = () => {
    setSelectedEmployees([])
  }

  // Auto-select all employees when switching to "selected" mode
  const handleExportTypeChange = (type: 'all' | 'selected') => {
    setExportType(type)
    if (type === 'selected' && selectedEmployees.length === 0) {
      // Default to all employees selected
      setSelectedEmployees(employees.map(emp => emp.employee_code))
    }
  }

  const presetOptions = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'previousWeek', label: 'Previous Week' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'previousMonth', label: 'Previous Month' },
    { key: 'thisQuarter', label: 'This Quarter' },
    { key: 'previousQuarter', label: 'Previous Quarter' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'previousYear', label: 'Previous Year' },
    { key: 'custom', label: 'Custom Range' }
  ]

  return (
    <div className="flex items-center gap-3">
      {/* Date Range Picker */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Date Range: {selectedRange.label}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {!showCustom ? (
              <div className="p-2">
                <div className="space-y-1">
                  {presetOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleRangeSelect(option.key)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors ${
                        selectedRange.label === option.label ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Custom Date Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCustomRangeApply}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowCustom(false)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee Selection */}
      <div className="relative">
        <button
          onClick={() => setShowEmployeeSelection(!showEmployeeSelection)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <Users className="w-4 h-4" />
          <span>Employee: {selectedEmployees.length === employees.length ? 'All' : `Selected (${selectedEmployees.length})`}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showEmployeeSelection && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 flex flex-col" style={{height: '400px'}}>
            {/* Header - Fixed */}
            <div className="p-3 border-b border-gray-200 flex-shrink-0">
              <div className="text-sm font-medium text-gray-700">Select employees to include in export:</div>
            </div>

            {/* Scrollable Employee List */}
            <div className="flex-1 overflow-y-auto p-3">
              {employees.length > 0 ? (
                <div className="space-y-1">
                  {employees.map((employee) => (
                    <label key={employee.employee_code} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.employee_code)}
                        onChange={() => handleEmployeeToggle(employee.employee_code)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        {employee.employee_name} ({employee.employee_code})
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-4 text-center">No employees available</div>
              )}
            </div>

            {/* Fixed Bottom Buttons */}
            <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="space-y-2">
                {/* Select All / Clear buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-md hover:bg-purple-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Clear
                  </button>
                </div>
                {/* Apply Selection button */}
                <button
                  onClick={() => setShowEmployeeSelection(false)}
                  className="w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                >
                  Apply Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <ZohoButton
        variant="secondary"
        icon={<Download className="w-4 h-4" />}
        onClick={handleExport}
      >
        Export Excel
      </ZohoButton>
    </div>
  )
}
