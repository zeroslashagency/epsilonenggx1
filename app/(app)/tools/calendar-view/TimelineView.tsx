"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Moon, Plus } from 'lucide-react'

// Types matching the ones we'll use in page.tsx
export interface TimelineShift {
  id: string
  date: string // YYYY-MM-DD
  shiftName: string
  startTime: string
  endTime: string
  color: string
  overnight: boolean
  shiftId?: string
  shiftType?: string
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
  showWeekends?: boolean
  onSelectShift?: (employee: TimelineEmployee, shift: TimelineShift) => void
  onSelectEmpty?: (employee: TimelineEmployee, date: string) => void
}

export function TimelineView({ employees, currentDate, onDateChange, isLoading, showWeekends = true, onSelectShift, onSelectEmpty }: TimelineViewProps) {
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

    const filtered = showWeekends ? dates : dates.filter(d => {
      const day = d.getDay()
      return day !== 0 && day !== 6
    })

    setDaysInView(filtered)
  }, [currentDate, showWeekends])

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
      <div className="flex h-[420px] items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const CELL_WIDTH = 130 // px width for each day column

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
    <div className="flex flex-col h-full bg-transparent overflow-hidden min-w-0">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Timeline</h2>
          <span className="text-xs text-gray-500">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              onDateChange(newDate)
            }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => {
              onDateChange(new Date())
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors font-semibold"
          >
            Today
          </button>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              onDateChange(newDate)
            }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Unified Scrollable Timeline Grid */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-x-auto overflow-y-auto bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 max-w-full min-w-0"
      >
        <div className="min-w-max flex flex-col">

          {/* 1. Header Row (Sticky Top) */}
          <div className="flex sticky top-0 z-[5] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 shadow-sm">
            {/* Top-Left Corner (Sticky Left + Top) */}
            <div
              className="sticky left-0 z-[10] w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex items-center px-4 font-semibold text-gray-600 dark:text-gray-300 text-sm shadow-[4px_0_18px_rgba(0,0,0,0.08)]"
            >
              Staff Member
            </div>

            {/* Connected Date Columns */}
            {daysInView.map((date, i) => {
              const isT = isToday(date)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              // Show month label if it's the 1st of the month OR the very first visible day
              const showMonthLabel = date.getDate() === 1 || i === 0

              return (
                <div
                  key={formatDate(date)}
                  data-is-today={isT}
                  className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center relative ${isT ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''} ${isWeekend ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                  style={{ width: CELL_WIDTH }}
                >
                  {/* Month Label (e.g. "Oct") */}
                  {showMonthLabel && (
                    <div className="absolute top-1 left-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/70 dark:bg-gray-900/70 px-1 rounded z-10">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  )}

                  {isT && <div className="absolute inset-y-0 left-1/2 w-px bg-blue-400/60 pointer-events-none" />}
                  <span className={`text-[10px] font-semibold uppercase mb-1 ${isT ? 'text-blue-600' : 'text-gray-500'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isT ? 'bg-blue-600 text-white shadow' : 'text-gray-700 dark:text-gray-200'}`}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 2. Employee Rows */}
          {sortedEmployees.map((emp, index) => (
            <div
              key={emp.id}
              className={`flex h-[76px] border-b border-gray-200 dark:border-gray-800 relative group transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/70 dark:bg-gray-800/50'
                } hover:bg-blue-50/60 dark:hover:bg-gray-800`}
            >

              {/* Employee Name (Sticky Left) */}
              <div
                className={`sticky left-0 z-[5] w-64 border-r border-gray-200 dark:border-gray-800 flex items-center px-4 shadow-[4px_0_18px_rgba(0,0,0,0.06)] transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-900 group-hover:bg-blue-50/60 dark:group-hover:bg-gray-800' : 'bg-gray-50/70 dark:bg-gray-800 group-hover:bg-blue-50/60 dark:group-hover:bg-gray-800'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border border-gray-200 dark:border-gray-700 shadow-sm ${['bg-blue-100/70 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200',
                    'bg-purple-100/70 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200',
                    'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
                    'bg-amber-100/70 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'][index % 4]
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
                const isWeekend = date.getDay() === 0 || date.getDay() === 6

                return (
                  <div
                    key={formatDate(date)}
                    className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 relative flex items-center justify-center px-2 py-3 ${isT ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${isWeekend ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {isT && <div className="absolute inset-y-0 left-1/2 w-px bg-blue-400/30 pointer-events-none" />}

                    {shift ? (
                      (() => {
                        const color = shift.color || '#3B82F6'

                        return (
                          <div
                            className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-center px-3 text-xs relative overflow-hidden transition-all hover:shadow-md cursor-pointer"
                            style={{
                              backgroundColor: `${color}22`,
                              borderLeftWidth: '4px',
                              borderLeftColor: color
                            }}
                            title={`${shift.shiftName} (${shift.startTime} - ${shift.endTime})`}
                            onClick={() => onSelectShift?.(emp, shift)}
                          >
                            <div className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              {shift.shiftName}
                              {shift.overnight && <Moon className="w-3 h-3 text-blue-500" />}
                            </div>
                            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-300 truncate mt-0.5">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      // Empty state with subtle pattern or clear interactivity
                      <div className="group w-full h-full rounded-lg border border-dashed border-transparent hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex items-center justify-center">
                        {onSelectEmpty && (
                          <button
                            type="button"
                            onClick={() => onSelectEmpty(emp, formatDate(date))}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600 bg-white/80 dark:bg-gray-900/70 border border-blue-100 dark:border-blue-800 rounded-full w-7 h-7 flex items-center justify-center shadow-sm"
                            title="Assign schedule"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
