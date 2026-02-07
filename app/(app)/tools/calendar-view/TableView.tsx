"use client"

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Moon, Download } from 'lucide-react'
import { TimelineEmployee } from './TimelineView'

// Types specific to Table View
interface EmployeeSchedule {
    id: string
    code: string
    name: string
    department: string
    weeks: {
        weekNumber: number
        dateRange: string
        shiftName: string
        timeRange: string
        color: string
        overnight: boolean
    }[]
}

export function TableView({
    employees,
    currentDate,
    onDateChange,
    isLoading
}: {
    employees: TimelineEmployee[]
    currentDate: Date
    onDateChange: (date: Date) => void
    isLoading: boolean
}) {
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all')

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const previousMonth = () => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() - 1)
        onDateChange(newDate)
    }

    const nextMonth = () => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + 1)
        onDateChange(newDate)
    }

    const employeeSchedules = useMemo(() => {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        const startStr = startDate.toISOString().split('T')[0]
        const endStr = endDate.toISOString().split('T')[0]

        const employeeMap = new Map<string, EmployeeSchedule>()

        employees.forEach((emp) => {
            emp.shifts
                .filter((shift) => shift.date >= startStr && shift.date <= endStr)
                .forEach((shift) => {
                    if (!employeeMap.has(emp.id)) {
                        employeeMap.set(emp.id, {
                            id: emp.id,
                            code: emp.code,
                            name: emp.name,
                            department: emp.department,
                            weeks: []
                        })
                    }

                    const scheduleDate = new Date(shift.date)
                    const weekNumber = Math.ceil(scheduleDate.getDate() / 7)

                    const employeeEntry = employeeMap.get(emp.id)!
                    let weekEntry = employeeEntry.weeks.find((w) => w.weekNumber === weekNumber)
                    if (!weekEntry) {
                        const weekStart = new Date(scheduleDate)
                        weekStart.setDate(scheduleDate.getDate() - scheduleDate.getDay())
                        const weekEnd = new Date(weekStart)
                        weekEnd.setDate(weekStart.getDate() + 6)

                        weekEntry = {
                            weekNumber,
                            dateRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${weekEnd.getDate()}`,
                            shiftName: shift.shiftName || 'No Shift',
                            timeRange: `${shift.startTime?.slice(0, 5) || '09:00'} - ${shift.endTime?.slice(0, 5) || '18:00'}`,
                            color: shift.color || '#DFF0D8',
                            overnight: shift.overnight || false
                        }
                        employeeEntry.weeks.push(weekEntry)
                    }
                })
        })

        return Array.from(employeeMap.values())
    }, [employees, currentDate])


    const filteredEmployees = selectedEmployee === 'all'
        ? employeeSchedules
        : employeeSchedules.filter(e => e.id === selectedEmployee)

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Monthly Overview
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Weekly breakdown of schedules
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={previousMonth}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
                            {formatMonth(currentDate)}
                        </div>
                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Employees</option>
                        {employeeSchedules.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend:</div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DFF0D8' }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">General No.1</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D9EDF7' }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">General No.2</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D4EDDA' }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Rotational No.1</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Overnight</span>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading schedules...</span>
                    </div>
                </div>
            )}

            {/* Desktop: Table View */}
            {!isLoading && (
                <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Week 1
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Week 2
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Week 3
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Week 4
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredEmployees.map(employee => (
                                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">{employee.code}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-500">{employee.department}</div>
                                        </td>
                                        {employee.weeks.map(week => (
                                            <td key={week.weekNumber} className="px-6 py-4">
                                                <div
                                                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                                                    style={{ backgroundColor: `${week.color}60` }}
                                                >
                                                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                                                        {week.dateRange}
                                                    </div>
                                                    <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                                                        {week.timeRange}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: week.color }} />
                                                        {week.overnight && <Moon className="w-3 h-3 text-blue-500 ml-1" />}
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            )}

            {/* Mobile: Card View */}
            {!isLoading && (
                <div className="lg:hidden space-y-4">
                    {filteredEmployees.map(employee => (
                        <div key={employee.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <div className="font-semibold text-gray-900 dark:text-white">{employee.name} ({employee.code})</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{employee.department}</div>
                            </div>
                            <div className="p-4 space-y-3">
                                {employee.weeks.map(week => (
                                    <div
                                        key={week.weekNumber}
                                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                        style={{ backgroundColor: `${week.color}40` }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                                Week {week.weekNumber}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {week.dateRange}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                            {week.shiftName}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {week.timeRange}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: week.color }} />
                                                {week.overnight && <Moon className="w-3 h-3 text-blue-500" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && filteredEmployees.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No schedules found</p>
                </div>
            )}
        </div>
    )
}
