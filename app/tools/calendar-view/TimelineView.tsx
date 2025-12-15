"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Moon, Sun, Sunset } from 'lucide-react'

// Types matching the ones we'll use in page.tsx
export interface TimelineShift {
  id: string
  date: string // YYYY-MM-DD
  shiftName: string
  startTime: string
  endTime: string
  color: string
  overnight: boolean
}

export interface TimelineEmployee {
  id: string
  code: string
  name: string
  department: string
  shifts: TimelineShift[]
}

interface TimelineViewProps {
  employees: TimelineEmployee[]
  currentDate: Date
  onDateChange: (date: Date) => void
  isLoading: boolean
}

// Shift Type definitions/styles
const SHIFT_STYLES = {
  morning: {
    bg: 'bg-amber-500',
    text: 'text-gray-900',
    icon: Sun,
    label: 'Morning'
  },
  evening: {
    bg: 'bg-orange-500',
    text: 'text-gray-900',
    icon: Sunset,
    label: 'Evening'
  },
  night: {
    bg: 'bg-indigo-600',
    text: 'text-white',
    icon: Moon,
    label: 'Night'
  },
  default: {
    bg: 'bg-blue-600',
    text: 'text-white',
    icon: Clock,
    label: 'Shift'
  }
}

function getShiftType(startTime: string) {
  const hour = parseInt(startTime.split(':')[0], 10)
  if (hour >= 5 && hour < 14) return 'morning'
  if (hour >= 14 && hour < 22) return 'evening'
  return 'night'
}

export function TimelineView({ employees, currentDate, onDateChange, isLoading }: TimelineViewProps) {
  const [daysInView, setDaysInView] = useState<Date[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate the days for the timeline (current month)
  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const days = new Date(year, month + 1, 0).getDate()

    const dates: Date[] = []
    for (let i = 1; i <= days; i++) {
      dates.push(new Date(year, month, i))
    }
    setDaysInView(dates)
  }, [currentDate])

  // Helpers
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const getShiftForDate = (employee: TimelineEmployee, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return employee.shifts.find(s => s.date === dateStr)
  }

  // Scroll to "Today" on initial load
  useEffect(() => {
    if (containerRef.current && !isLoading) {
      const todayEl = containerRef.current.querySelector('[data-is-today="true"]')
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [daysInView, isLoading])

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-gray-900 rounded-xl border border-gray-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const CELL_WIDTH = 140 // px width for each day column

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-200px)]">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 z-20">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Shift Timeline
          <span className="text-sm font-normal text-gray-500 ml-2">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              onDateChange(newDate)
            }}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              onDateChange(new Date()) // Go to Today
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              onDateChange(newDate)
            }}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Sidebar (Employees) - Sticky */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 bg-gray-900 z-10 flex flex-col">
          {/* Header Spacer */}
          <div className="h-14 border-b border-gray-800 bg-gray-900 sticky top-0 z-20 flex items-center px-4 font-semibold text-gray-400 text-sm">
            Employee
          </div>

          {/* Employee List */}
          <div className="overflow-hidden">
            {employees.map(emp => (
              <div key={emp.id} className="h-20 flex items-center px-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold border border-gray-700">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white truncate w-32">{emp.name}</div>
                    <div className="text-xs text-gray-500 truncate w-32">{emp.department}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-900/50"
        >
          <div className="flex flex-col min-w-max">

            {/* Date Header */}
            <div className="flex sticky top-0 z-10 bg-gray-900 border-b border-gray-800 h-14">
              {daysInView.map(date => {
                const isT = isToday(date)
                return (
                  <div
                    key={date.toISOString()}
                    data-is-today={isT}
                    className={`flex-shrink-0 border-r border-gray-800 flex flex-col items-center justify-center relative ${isT ? 'bg-blue-900/10' : ''}`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {isT && <div className="absolute inset-y-0 left-1/2 w-px bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] z-20" />}
                    <span className={`text-xs font-medium uppercase mb-1 ${isT ? 'text-blue-400' : 'text-gray-500'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-sm font-bold ${isT ? 'text-white bg-blue-600 px-2 rounded-full' : 'text-gray-300'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Employee Rows */}
            {employees.map(emp => (
              <div key={emp.id} className="flex h-20 border-b border-gray-800 relative">
                {daysInView.map(date => {
                  const shift = getShiftForDate(emp, date)
                  const isT = isToday(date)

                  return (
                    <div
                      key={date.toISOString()}
                      className={`flex-shrink-0 border-r border-gray-800 relative group flex items-center justify-center px-2 py-3 ${isT ? 'bg-blue-900/5' : ''}`}
                      style={{ width: CELL_WIDTH }}
                    >
                      {isT && <div className="absolute inset-y-0 left-1/2 w-px bg-blue-500/20 pointer-events-none" />}

                      {shift ? (
                        (() => {
                          const type = getShiftType(shift.startTime)
                          const style = SHIFT_STYLES[type] || SHIFT_STYLES.default
                          const Icon = style.icon

                          return (
                            <div
                              className={`w-full h-full rounded-md flex flex-col justify-center px-3 text-xs relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer ${style.bg} ${style.text}`}
                              title={`${shift.shiftName} (${shift.startTime} - ${shift.endTime})`}
                            >
                              <div className="font-bold truncate flex items-center gap-1">
                                <Icon className="w-3 h-3 flex-shrink-0" />
                                {shift.shiftName}
                              </div>
                              <div className="opacity-90 text-[10px] truncate">
                                {shift.startTime}-{shift.endTime}
                              </div>
                            </div>
                          )
                        })()
                      ) : (
                        <div className="w-full h-full rounded-md hover:bg-gray-800/30 transition-colors" /> // Empty slot placeholder
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  )
}
