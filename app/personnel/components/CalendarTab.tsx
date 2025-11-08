'use client'

import { useState, useEffect } from 'react'
import { Calendar, X, Clock, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface CalendarTabProps {
  employeeCode: string
  employeeName: string
}

interface AttendanceLog {
  log_date: string
  punch_direction: string
  employee_code: string
}

interface DayData {
  date: string
  dayNumber: number
  status: 'present' | 'late' | 'absent' | 'weekend' | 'future'
  punchCount: number
  logs: AttendanceLog[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarTab({ employeeCode, employeeName }: CalendarTabProps) {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())
  const [selectedDate, setSelectedDate] = useState<DayData | null>(null)
  const [calendarData, setCalendarData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (employeeCode) {
      fetchMonthAttendance()
    }
  }, [selectedYear, selectedMonth, employeeCode])

  const fetchMonthAttendance = async () => {
    try {
      setLoading(true)
      
      const firstDay = new Date(selectedYear, selectedMonth, 1)
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
      const fromDate = firstDay.toISOString().split('T')[0]
      const toDate = lastDay.toISOString().split('T')[0]

      const data = await apiGet(`/api/get-attendance?employeeCode=${employeeCode}&fromDate=${fromDate}&toDate=${toDate}`)

      if (data.success && data.data?.allLogs) {
        const logs = data.data.allLogs
        const processedData = processCalendarData(logs, selectedYear, selectedMonth)
        setCalendarData(processedData)
      } else {
        setCalendarData(generateEmptyCalendar(selectedYear, selectedMonth))
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
      setCalendarData(generateEmptyCalendar(selectedYear, selectedMonth))
    } finally {
      setLoading(false)
    }
  }

  const processCalendarData = (logs: AttendanceLog[], year: number, month: number): DayData[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const calendarDays: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      
      // Filter logs for this specific day
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.log_date)
        return logDate.getDate() === day && 
               logDate.getMonth() === month && 
               logDate.getFullYear() === year
      })

      let status: DayData['status'] = 'absent'
      
      // Check if employee worked on this day
      if (dayLogs.length > 0) {
        // Employee has punch records - they worked this day
        const firstIn = dayLogs.find(log => log.punch_direction?.toLowerCase() === 'in')
        if (firstIn) {
          const punchTime = new Date(firstIn.log_date)
          const hour = punchTime.getHours()
          status = hour >= 9 ? 'late' : 'present'
        } else {
          status = 'present'
        }
      } else if (date > today) {
        // Future date
        status = 'future'
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend with no punches
        status = 'weekend'
      } else {
        // Weekday with no punches
        status = 'absent'
      }

      calendarDays.push({
        date: dateStr,
        dayNumber: day,
        status,
        punchCount: dayLogs.length,
        logs: dayLogs
      })
    }

    return calendarDays
  }

  const generateEmptyCalendar = (year: number, month: number): DayData[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const calendarDays: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      
      let status: DayData['status'] = 'weekend'
      if (date > today) {
        status = 'future'
      } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Only mark weekdays as absent if no data
        status = 'absent'
      }

      calendarDays.push({
        date: dateStr,
        dayNumber: day,
        status,
        punchCount: 0,
        logs: []
      })
    }

    return calendarDays
  }

  const generateWeeks = (): (DayData | null)[][] => {
    const weeks: (DayData | null)[][] = []
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    let firstDayOfWeek = firstDay.getDay()
    // Convert Sunday (0) to 7, then subtract 1 to make Monday = 0
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    let currentWeek: (DayData | null)[] = []
    
    // Fill empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null)
    }
    
    // Add all days
    calendarData.forEach(day => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })
    
    // Fill remaining cells in last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null)
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }

  const calculateStats = () => {
    const workingDays = calendarData.filter(d => d.status !== 'weekend' && d.status !== 'future')
    const presentDays = calendarData.filter(d => d.status === 'present' || d.status === 'late')
    const lateDays = calendarData.filter(d => d.status === 'late')
    const absentDays = calendarData.filter(d => d.status === 'absent')
    
    const rate = workingDays.length > 0 
      ? Math.round((presentDays.length / workingDays.length) * 100) 
      : 0

    return {
      present: presentDays.length,
      late: lateDays.length,
      absent: absentDays.length,
      total: workingDays.length,
      rate
    }
  }

  const stats = calculateStats()
  const weeks = generateWeeks()

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Calendar</h3>
        
        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {MONTHS.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          
          {/* Stats Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
            <TrendingUp className="w-4 h-4" />
            {stats.present}/{stats.total} days ({stats.rate}%)
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {MONTHS[selectedMonth]} {selectedYear}
        </h4>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {weeks.map((week, weekIdx) => (
                week.map((day, dayIdx) => (
                  <CalendarDay
                    key={`${weekIdx}-${dayIdx}`}
                    day={day}
                    onClick={() => day && day.status !== 'future' && day.punchCount > 0 && setSelectedDate(day)}
                    isSelected={selectedDate?.date === day?.date}
                  />
                ))
              ))}
            </div>
            
            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-lg"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Present ({stats.present - stats.late})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-lg"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Late ({stats.late})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-lg"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Absent ({stats.absent})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Weekend</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Date Detail Modal */}
      {selectedDate && (
        <DateDetailModal 
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

function CalendarDay({ day, onClick, isSelected }: { 
  day: DayData | null
  onClick: () => void
  isSelected: boolean 
}) {
  if (!day) {
    return <div className="aspect-square"></div>
  }
  
  const statusConfig = {
    present: {
      bg: 'bg-green-500 dark:bg-green-600',
      border: 'border-green-500 dark:border-green-600',
      text: 'text-white',
      dotColor: 'bg-white'
    },
    late: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      border: 'border-yellow-500 dark:border-yellow-600',
      text: 'text-white',
      dotColor: 'bg-white'
    },
    absent: {
      bg: 'bg-red-500 dark:bg-red-600',
      border: 'border-red-500 dark:border-red-600',
      text: 'text-white',
      dotColor: 'bg-white'
    },
    weekend: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-500 dark:text-gray-400',
      dotColor: 'bg-gray-400'
    },
    future: {
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-400 dark:text-gray-500',
      dotColor: 'bg-gray-300'
    }
  }
  
  const config = statusConfig[day.status]
  const isClickable = day.status !== 'future' && day.punchCount > 0
  
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`
        aspect-square p-3 rounded-xl border transition-all relative
        ${config.bg} ${config.border} ${config.text}
        ${isClickable ? 'hover:shadow-xl hover:scale-105 cursor-pointer' : 'cursor-default opacity-60'}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
      `}
    >
      <div className="flex flex-col items-center justify-between h-full">
        <div className="text-base font-bold">{day.dayNumber}</div>
        {day.punchCount > 0 && (
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></div>
            <span className="text-xs font-semibold">{day.punchCount}</span>
          </div>
        )}
      </div>
    </button>
  )
}

function DateDetailModal({ date, onClose }: { date: DayData; onClose: () => void }) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getPunchIcon = (direction: string) => {
    return direction?.toLowerCase() === 'in' ? 'IN' : 'OUT'
  }
  
  const getPunchIconColor = (direction: string) => {
    return direction?.toLowerCase() === 'in' 
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
  }

  const calculateTotalHours = () => {
    if (date.logs.length < 2) return 'N/A'
    
    const inLogs = date.logs.filter(l => l.punch_direction?.toLowerCase() === 'in')
    const outLogs = date.logs.filter(l => l.punch_direction?.toLowerCase() === 'out')
    
    if (inLogs.length === 0 || outLogs.length === 0) return 'N/A'
    
    const firstIn = new Date(inLogs[0].log_date)
    const lastOut = new Date(outLogs[outLogs.length - 1].log_date)
    
    const diffMs = lastOut.getTime() - firstIn.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {formatDate(date.date)}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Status Badge */}
        <div className="mb-6">
          {date.status === 'present' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Present
            </div>
          )}
          {date.status === 'late' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg font-semibold">
              <Clock className="w-4 h-4" />
              Late Arrival
            </div>
          )}
          {date.status === 'absent' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-semibold">
              <XCircle className="w-4 h-4" />
              Absent
            </div>
          )}
        </div>
        
        {/* Punch History */}
        {date.logs.length > 0 ? (
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white">Punch History:</h4>
            {date.logs.map((log, idx) => {
              const isLate = log.punch_direction?.toLowerCase() === 'in' && new Date(log.log_date).getHours() >= 9
              return (
                <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${getPunchIconColor(log.punch_direction)}`}>
                    {getPunchIcon(log.punch_direction)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">
                      {formatTime(log.log_date)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {log.punch_direction?.toLowerCase() === 'in' ? 'Check In' : 'Check Out'}
                    </div>
                  </div>
                  {isLate && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs font-semibold">
                      <Clock className="w-3 h-3" />
                      Late
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No punch records for this day
          </div>
        )}
        
        {/* Summary */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Summary:</h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>• Total Hours: {calculateTotalHours()}</li>
            <li>• Punch Count: {date.punchCount}</li>
            <li>• Status: {date.status.charAt(0).toUpperCase() + date.status.slice(1)}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
