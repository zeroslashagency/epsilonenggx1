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

  // Generate the days for the timeline (Prev month + Current month + Next month)
  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() // 0-indexed

    // Range: Start of Prev Month to End of Next Month
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month + 2, 0) // Day 0 of month+2 is last day of month+1

    const dates: Date[] = []

    // Iterate day by day
    const loop = new Date(start)
    while (loop <= end) {
      dates.push(new Date(loop))
      loop.setDate(loop.getDate() + 1)
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

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getShiftForDate = (employee: TimelineEmployee, date: Date) => {
    const dateStr = formatDate(date)
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

  // Sort employees: Those with shift on currentDate first, then by name
  const sortedEmployees = [...employees].sort((a, b) => {
    const hasShiftA = !!getShiftForDate(a, currentDate)
    const hasShiftB = !!getShiftForDate(b, currentDate)

    if (hasShiftA && !hasShiftB) return -1
    if (!hasShiftA && hasShiftB) return 1

    // Stable sort by name if shift status is same
    return a.name.localeCompare(b.name)
  })

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

      {/* Unified Scrollable Timeline Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-900 border-t border-gray-800"
      >
        <div className="min-w-max flex flex-col">

          {/* 1. Header Row (Sticky Top) */}
          <div className="flex sticky top-0 z-40 bg-gray-900 border-b border-gray-800 h-14 shadow-sm">
            {/* Top-Left Corner (Sticky Left + Top) */}
            <div
              className="sticky left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex items-center px-4 font-semibold text-gray-400 text-sm shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: '#111827' }} // Force opaque dark mode color
            >
              Staff Member
            </div>

            {/* Connected Date Columns */}
            {daysInView.map((date, i) => {
              const isT = isToday(date)
              // Show month label if it's the 1st of the month OR the very first visible day
              const showMonthLabel = date.getDate() === 1 || i === 0

              return (
                <div
                  key={formatDate(date)}
                  data-is-today={isT}
                  className={`flex-shrink-0 border-r border-gray-800 flex flex-col items-center justify-center relative ${isT ? 'bg-blue-900/10' : ''}`}
                  style={{ width: CELL_WIDTH }}
                >
                  {/* Month Label (e.g. "Oct") */}
                  {showMonthLabel && (
                    <div className="absolute top-1 left-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900 px-1 rounded z-10">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  )}

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

          {/* 2. Employee Rows */}
          {sortedEmployees.map((emp, index) => (
            <div
              key={emp.id}
              className={`flex h-20 border-b border-gray-200 dark:border-gray-800 relative group transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                } hover:bg-blue-50 dark:hover:bg-gray-800`}
            >

              {/* Employee Name (Sticky Left) */}
              <div
                className={`sticky left-0 z-30 w-64 border-r border-gray-200 dark:border-gray-800 flex items-center px-4 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-900 group-hover:bg-blue-50 dark:group-hover:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-gray-800'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border border-gray-200 dark:border-gray-700 shadow-sm ${['bg-blue-100/50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200',
                    'bg-purple-100/50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200',
                    'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
                    'bg-amber-100/50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'][index % 4]
                    }`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate w-36">{emp.name}</div>
                    <div className="text-xs text-gray-500 truncate w-36">{emp.department}</div>
                  </div>
                </div>
              </div>

              {/* Shift Cells */}
              {daysInView.map(date => {
                const shift = getShiftForDate(emp, date)
                const isT = isToday(date)

                return (
                  <div
                    key={formatDate(date)}
                    className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 relative flex items-center justify-center px-2 py-3 ${isT ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
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
                            className={`w-full h-full rounded-md flex flex-col justify-center px-3 text-xs relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer ${style.bg} ${style.text}`}
                            title={`${shift.shiftName} (${shift.startTime} - ${shift.endTime})`}
                          >
                            <div className="font-bold truncate flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-75" />
                              {shift.shiftName}
                            </div>
                            <div className="opacity-90 text-[10px] font-medium truncate mt-0.5">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      // Empty state with subtle pattern or clear interactivity
                      <div className="w-full h-full rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors group-hover/cell:border-2 border-dashed border-transparent hover:border-gray-300 dark:hover:border-gray-600" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
