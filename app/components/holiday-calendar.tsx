"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DateRange } from "react-day-picker"
import { DateTimePicker } from "./date-time-picker"

interface Holiday {
  id: string
  startDateTime: string
  endDateTime: string
  reason: string
}

interface HolidayCalendarProps {
  holidays: Holiday[]
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void
  onDeleteHoliday: (id: string) => void
  disabled?: boolean
}

export function HolidayCalendar({ holidays, onAddHoliday, onDeleteHoliday, disabled = false }: HolidayCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [reason, setReason] = useState("")

  const handleAddHoliday = () => {
    if (!dateRange?.from || !dateRange?.to || !startTime || !endTime) {
      alert("Please select date range and fill in time fields")
      return
    }

    // Combine date and time
    const startDateTime = `${format(dateRange.from, "yyyy-MM-dd")}T${startTime}`
    const endDateTime = `${format(dateRange.to, "yyyy-MM-dd")}T${endTime}`
    const start = new Date(startDateTime)
    const end = new Date(endDateTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      alert("Holiday end must be after start")
      return
    }

    onAddHoliday({
      startDateTime,
      endDateTime,
      reason: reason || "Holiday"
    })

    // Reset form
    setDateRange(undefined)
    setStartTime("")
    setEndTime("")
    setReason("")
  }

  const handleDeleteHoliday = (id: string) => {
    onDeleteHoliday(id)
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Holiday Calendar (Global Pauses)
        </CardTitle>
        <CardDescription>Schedule global production pauses and holidays</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unified Date Range and Time Selection */}
        <div className="space-y-6">
          {/* Date & Time Range Picker */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-900">Select Holiday Period</Label>
            
            <DateTimePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              startTime={startTime}
              onStartTimeChange={setStartTime}
              endTime={endTime}
              onEndTimeChange={setEndTime}
              placeholder="Pick start and end dates with times"
              disabled={disabled}
              onSelect={() => {
                // Optional: You can add any logic here when user clicks Select
              }}
            />
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Select date range and times for the holiday period
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="holidayReason" className="text-sm font-medium text-gray-700">Reason (Optional)</Label>
            <Input
              id="holidayReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., National Holiday, Maintenance, Company Event"
              className="border-gray-200 focus:border-blue-500"
              disabled={disabled}
            />
          </div>

          {/* Add Holiday Button */}
          <Button 
            onClick={handleAddHoliday}
            className="bg-blue-600 hover:bg-blue-700 w-full"
            disabled={disabled}
          >
            📅 Add Holiday Period
          </Button>
        </div>

        {/* Saved Holidays */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Saved Holidays
            <Badge variant="secondary" className="ml-2">
              {holidays.length} holidays
            </Badge>
          </h3>
          
          {holidays.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">No holidays added yet</p>
              <p className="text-gray-400 text-sm">Add holiday periods to pause production globally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {new Date(holiday.startDateTime).toLocaleDateString()}
                        </Badge>
                        <span className="text-gray-400">to</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(holiday.endDateTime).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {new Date(holiday.startDateTime).toLocaleTimeString()} - {new Date(holiday.endDateTime).toLocaleTimeString()}
                      </p>
                      <p className="text-sm font-medium text-gray-900">{holiday.reason}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                      disabled={disabled}
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
  )
}
