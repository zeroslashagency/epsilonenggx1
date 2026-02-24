'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { DateRange } from 'react-day-picker'

interface DateTimePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  startTime: string
  onStartTimeChange: (time: string) => void
  endTime: string
  onEndTimeChange: (time: string) => void
  placeholder?: string
  className?: string
  onSelect?: () => void // Callback when user clicks Select button
  disabled?: boolean
}

export function DateTimePicker({
  dateRange,
  onDateRangeChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  placeholder = 'Pick start and end dates with times',
  className,
  onSelect,
  disabled = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [validationError, setValidationError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false)
    }
  }, [disabled, isOpen])

  useEffect(() => {
    if (!validationError) return
    if (dateRange?.from && dateRange?.to && startTime && endTime) {
      setValidationError('')
    }
  }, [validationError, dateRange, startTime, endTime])

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    if (!startTime) onStartTimeChange('06:00')
    if (!endTime) onEndTimeChange('22:00')
  }, [dateRange, startTime, endTime, onStartTimeChange, onEndTimeChange])

  // Generate time options (every 30 minutes)
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  // Quick time presets
  const timePresets = [
    { label: 'All Day', start: '00:00', end: '23:30' },
    { label: 'Business Hours', start: '09:00', end: '17:30' },
    { label: 'Morning Shift', start: '06:00', end: '14:30' },
    { label: 'Evening Shift', start: '14:00', end: '22:30' },
    { label: 'Night Shift', start: '22:00', end: '06:30' },
  ]

  const handlePresetClick = (preset: (typeof timePresets)[0]) => {
    onStartTimeChange(preset.start)
    onEndTimeChange(preset.end)
  }

  const handleClear = () => {
    onDateRangeChange(undefined)
    onStartTimeChange('')
    onEndTimeChange('')
    setValidationError('')
    setIsOpen(false)
  }

  const handleSelect = () => {
    if (!dateRange?.from || !dateRange?.to || !startTime || !endTime) {
      setValidationError('Please select both dates and both times.')
      return
    }

    setValidationError('')
    // Call the onSelect callback if provided
    if (onSelect) {
      onSelect()
    }
    // Close the picker after selection
    setIsOpen(false)
  }

  return (
    <div className={cn('space-y-3', className)} ref={containerRef}>
      {/* Trigger Button */}
      <div
        className={cn(
          'w-full justify-start text-left font-normal border border-gray-200 hover:border-blue-500 rounded-md px-3 py-2 cursor-pointer bg-white',
          !dateRange && 'text-gray-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <div className="flex flex-col">
                <span>
                  {format(dateRange.from, 'LLL dd, yyyy')} - {format(dateRange.to, 'LLL dd, yyyy')}
                </span>
                {startTime && endTime && (
                  <span className="text-sm text-gray-600">
                    {startTime} - {endTime}
                  </span>
                )}
                {(!startTime || !endTime) && (
                  <span className="text-sm text-amber-600">Time not selected</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span>{format(dateRange.from, 'LLL dd, yyyy')}</span>
                {startTime && <span className="text-sm text-gray-600">from {startTime}</span>}
              </div>
            )
          ) : (
            placeholder
          )}
        </div>
      </div>

      {/* Picker Panel */}
      {isOpen && (
        <div
          className={cn(
            'border border-gray-200 rounded-lg p-4 bg-white shadow-lg z-50 relative',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          {/* Date Range Picker */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Date Range
            </Label>
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={disabled ? undefined : onDateRangeChange}
              numberOfMonths={2}
              className="rounded-md"
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Start Time</Label>
              <div className="relative">
                <select
                  value={startTime}
                  onChange={e => onStartTimeChange(e.target.value)}
                  disabled={disabled}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select start time</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">End Time</Label>
              <div className="relative">
                <select
                  value={endTime}
                  onChange={e => onEndTimeChange(e.target.value)}
                  disabled={disabled}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select end time</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">Quick Time Presets</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Select today to tomorrow with business hours
                  const today = new Date()
                  const tomorrow = new Date(today)
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  onDateRangeChange({ from: today, to: tomorrow })
                  onStartTimeChange('09:00')
                  onEndTimeChange('17:30')
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={disabled}
              >
                🚀 Quick Select Today
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {timePresets.map(preset => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs hover:bg-blue-50"
                  disabled={disabled}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={disabled}
            >
              🗑️ Clear All
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSelect}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={disabled || !dateRange?.from || !dateRange?.to || !startTime || !endTime}
              >
                ✓ Select
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-gray-600 hover:text-gray-700"
                disabled={disabled}
              >
                ❌ Close
              </Button>
            </div>
          </div>
          {validationError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {validationError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
