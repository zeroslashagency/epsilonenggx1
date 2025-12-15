"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { TimelineView, TimelineEmployee } from './TimelineView'
import { TableView } from './TableView'
import { ShiftTimeView } from './ShiftTimeView'
import { BarChart3, LayoutGrid, Clock } from 'lucide-react'

// Unified Page Component
export default function CalendarViewPage() {
    const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'shift-time'>('timeline')

    // Timeline State (Table view handles its own data for now for simplicity)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [timelineEmployees, setTimelineEmployees] = useState<TimelineEmployee[]>([])
    const [timelineLoading, setTimelineLoading] = useState(true)

    const supabase = getSupabaseBrowserClient()

    // Fetch data specifically for Timeline View when active
    useEffect(() => {
        if (viewMode === 'timeline' || viewMode === 'shift-time') {
            fetchTimelineData()
        }
    }, [viewMode, currentDate])

    async function fetchTimelineData() {
        try {
            setTimelineLoading(true)

            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

            // Pad fetching to ensure we see adjacent days if needed, but standard month is fine
            // Adding a few days buffer for scrolling context
            const fetchStart = new Date(startDate); fetchStart.setDate(fetchStart.getDate() - 5);
            const fetchEnd = new Date(endDate); fetchEnd.setDate(fetchEnd.getDate() + 5);

            const { data: scheduleData, error } = await supabase
                .from('employee_daily_schedule')
                .select(`
          *,
          employee_master!inner (
            id,
            employee_code,
            employee_name,
            department
          )
        `)
                .gte('work_date', fetchStart.toISOString().split('T')[0])
                .lte('work_date', fetchEnd.toISOString().split('T')[0])

            if (error) throw error

            const employeeMap = new Map<string, TimelineEmployee>()

            scheduleData?.forEach((schedule: any) => {
                const empId = schedule.employee_master.id
                if (!employeeMap.has(empId)) {
                    employeeMap.set(empId, {
                        id: empId,
                        code: schedule.employee_master.employee_code,
                        name: schedule.employee_master.employee_name,
                        department: schedule.employee_master.department,
                        shifts: []
                    })
                }

                employeeMap.get(empId)!.shifts.push({
                    id: schedule.id,
                    date: schedule.work_date,
                    shiftName: schedule.shift_name || 'Shift',
                    startTime: schedule.shift_start?.slice(0, 5) || '',
                    endTime: schedule.shift_end?.slice(0, 5) || '',
                    color: schedule.color || '#3B82F6',
                    overnight: schedule.overnight || false
                })
            })

            setTimelineEmployees(Array.from(employeeMap.values()))

        } catch (error) {
            console.error(error)
            setTimelineEmployees([])
        } finally {
            setTimelineLoading(false)
        }
    }

    return (
        <PermissionGuard module="tools_shift" item="Calendar View">
            <ZohoLayout breadcrumbs={[
                { label: 'Tools', href: '/tools' },
                { label: 'Calendar View' }
            ]}>

                {/* Header with Toggle Switch */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar & Schedules</h1>
                        <p className="text-sm text-gray-500">Manage and view employee shifts</p>
                    </div>

                    <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'timeline'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Timeline
                        </button>
                        <div className="w-px bg-gray-300 dark:bg-gray-700 h-6 my-auto mx-1" />
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'table'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Table View
                        </button>
                        <div className="w-px bg-gray-300 dark:bg-gray-700 h-6 my-auto mx-1" />
                        <button
                            onClick={() => setViewMode('shift-time')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'shift-time'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            Shift Time
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[600px] bg-white dark:bg-gray-900/50 rounded-xl">
                    {viewMode === 'timeline' ? (
                        <TimelineView
                            employees={timelineEmployees}
                            currentDate={currentDate}
                            onDateChange={setCurrentDate}
                            isLoading={timelineLoading}
                        />
                    ) : viewMode === 'shift-time' ? (
                        <ShiftTimeView
                            employees={timelineEmployees}
                            currentDate={currentDate}
                            onDateChange={setCurrentDate}
                            isLoading={timelineLoading}
                        />
                    ) : (
                        <TableView />
                    )}
                </div>

            </ZohoLayout>
        </PermissionGuard>
    )
}
