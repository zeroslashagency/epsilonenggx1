"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
// import removed
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { TimelineView, TimelineEmployee, TimelineShift } from './TimelineView'
import { TableView } from './TableView'
import { ShiftTimeView } from './ShiftTimeView'
import { BarChart3, LayoutGrid, Clock, Search, Filter } from 'lucide-react'
import { AssignScheduleModal } from '@/app/(app)/tools/employee-assignment/AssignScheduleModal'

// Unified Page Component
export default function CalendarViewPage() {
    const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'shift-time'>('timeline')

    // Timeline State (Table view handles its own data for now for simplicity)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [timelineEmployees, setTimelineEmployees] = useState<TimelineEmployee[]>([])
    const [timelineLoading, setTimelineLoading] = useState(true)
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [departmentFilter, setDepartmentFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [shiftTypeFilter, setShiftTypeFilter] = useState<'all' | 'fixed' | 'rotation'>('all')
    const [rangePreset, setRangePreset] = useState<'1m' | '2m' | '3m'>('3m')
    const [showWeekends, setShowWeekends] = useState(true)
    const [availableDepartments, setAvailableDepartments] = useState<string[]>([])
    const [shiftTemplateTypeMap, setShiftTemplateTypeMap] = useState<Map<string, string>>(new Map())
    const [selectedShift, setSelectedShift] = useState<{ employee: TimelineEmployee; shift: TimelineShift } | null>(null)
    const [assignTarget, setAssignTarget] = useState<{ employee: TimelineEmployee; date?: string } | null>(null)

    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        async function loadTemplateTypes() {
            const { data } = await supabase.from('shift_templates').select('id, type, is_archived')
            const map = new Map<string, string>()
            data?.forEach((t: any) => {
                if (!t.is_archived) map.set(t.id, t.type || 'fixed')
            })
            setShiftTemplateTypeMap(map)
        }
        loadTemplateTypes()
    }, [])

    // Fetch data specifically for Timeline View when active
    useEffect(() => {
        fetchTimelineData()
    }, [currentDate, departmentFilter, rangePreset])

    async function fetchTimelineData() {
        try {
            setTimelineLoading(true)

            let startOffset = 0
            let endOffset = 0
            if (rangePreset === '3m') {
                startOffset = -1
                endOffset = 1
            } else if (rangePreset === '2m') {
                startOffset = 0
                endOffset = 1
            }

            const fetchStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + startOffset, 1)
            const fetchEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + endOffset + 1, 0)

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const params = new URLSearchParams({
                from: fetchStart.toISOString().split('T')[0],
                to: fetchEnd.toISOString().split('T')[0]
            })

            if (departmentFilter !== 'all') {
                params.set('department', departmentFilter)
            }

            const response = await fetch(`/api/schedule/range?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })
            const result = await response.json()
            if (!result.success) throw new Error(result.error || 'Failed to load schedule range')

            const scheduleData = result.data || []

            const employeeMap = new Map<string, TimelineEmployee>()
            const departments = new Set<string>()

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

                if (schedule.employee_master.department) {
                    departments.add(schedule.employee_master.department)
                }

                employeeMap.get(empId)!.shifts.push({
                    id: schedule.id,
                    date: schedule.work_date,
                    shiftName: schedule.shift_name || 'Shift',
                    startTime: schedule.shift_start?.slice(0, 5) || '',
                    endTime: schedule.shift_end?.slice(0, 5) || '',
                    color: schedule.color || '#3B82F6',
                    overnight: schedule.overnight || false,
                    shiftId: schedule.shift_id || undefined,
                    shiftType: schedule.shift_type || undefined
                })
            })

            setAvailableDepartments(Array.from(departments).sort())
            setTimelineEmployees(Array.from(employeeMap.values()))

        } catch (error) {
            console.error(error)
            setTimelineEmployees([])
        } finally {
            setTimelineLoading(false)
        }
    }

    const scheduleRefresh = () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(() => {
            fetchTimelineData()
        }, 600)
    }

    useEffect(() => {
        const channel = supabase
            .channel('calendar-view-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_daily_schedule' }, scheduleRefresh)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const filteredEmployees = useMemo(() => {
        let list = [...timelineEmployees]

        if (departmentFilter !== 'all') {
            list = list.filter(emp => emp.department === departmentFilter)
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(emp =>
                emp.name.toLowerCase().includes(q) ||
                emp.code.toLowerCase().includes(q) ||
                emp.department.toLowerCase().includes(q)
            )
        }

        if (shiftTypeFilter !== 'all') {
            list = list
                .map(emp => {
                    const filteredShifts = emp.shifts.filter(shift => {
                        const resolvedType = shift.shiftType || (shift.shiftId ? shiftTemplateTypeMap.get(shift.shiftId) : null)
                        if (!resolvedType) return shiftTypeFilter === 'fixed'
                        return resolvedType === shiftTypeFilter
                    })
                    return { ...emp, shifts: filteredShifts }
                })
                .filter(emp => emp.shifts.length > 0)
        }

        return list
    }, [timelineEmployees, departmentFilter, searchQuery, shiftTypeFilter, shiftTemplateTypeMap])

    const summaryStats = useMemo(() => {
        const shiftCount = filteredEmployees.reduce((sum, emp) => sum + emp.shifts.length, 0)
        return {
            employees: filteredEmployees.length,
            shifts: shiftCount
        }
    }, [filteredEmployees])

    return (
        <PermissionGuard module="tools_shift" item="Shift Management">
            <div className="h-full w-full p-6 overflow-x-hidden min-w-0">

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

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search employee, code, department..."
                            className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-white"
                        >
                            <option value="all">All Departments</option>
                            {availableDepartments.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
                        <select
                            value={shiftTypeFilter}
                            onChange={(e) => setShiftTypeFilter(e.target.value as any)}
                            className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-white"
                        >
                            <option value="all">All Shift Types</option>
                            <option value="fixed">Fixed</option>
                            <option value="rotation">Rotation</option>
                        </select>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
                        <select
                            value={rangePreset}
                            onChange={(e) => setRangePreset(e.target.value as any)}
                            className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-white"
                        >
                            <option value="1m">This Month</option>
                            <option value="2m">This + Next</option>
                            <option value="3m">Prev + This + Next</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowWeekends(!showWeekends)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showWeekends ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'}`}
                    >
                        {showWeekends ? 'Weekends: On' : 'Weekends: Off'}
                    </button>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        Employees: {summaryStats.employees}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        Shifts in range: {summaryStats.shifts}
                    </span>
                </div>

                {/* Content Area */}
                <div className="min-w-0 overflow-x-hidden">
                {viewMode === 'timeline' ? (
                    <TimelineView
                        employees={filteredEmployees}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        isLoading={timelineLoading}
                        showWeekends={showWeekends}
                        onSelectShift={(employee, shift) => setSelectedShift({ employee, shift })}
                        onSelectEmpty={(employee, date) => setAssignTarget({ employee, date })}
                    />
                ) : viewMode === 'shift-time' ? (
                    <ShiftTimeView
                        employees={filteredEmployees}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        isLoading={timelineLoading}
                    />
                ) : (
                    <TableView
                        employees={filteredEmployees}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        isLoading={timelineLoading}
                    />
                )}
                </div>

                {selectedShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedShift(null)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="text-sm text-gray-500">Shift Details</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{selectedShift.employee.name}</h3>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{selectedShift.employee.department}</div>
                            <div className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                                <div className="font-semibold text-gray-900 dark:text-white">{selectedShift.shift.shiftName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {selectedShift.shift.startTime} - {selectedShift.shift.endTime}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">{selectedShift.shift.date}</div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setAssignTarget({ employee: selectedShift.employee, date: selectedShift.shift.date })
                                        setSelectedShift(null)
                                    }}
                                    className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                    Assign Schedule
                                </button>
                                <button
                                    onClick={() => setSelectedShift(null)}
                                    className="py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {assignTarget && (
                    <AssignScheduleModal
                        employees={[{ code: assignTarget.employee.code, name: assignTarget.employee.name }]}
                        initialStartDate={assignTarget.date}
                        onClose={() => setAssignTarget(null)}
                        onSave={() => {
                            setAssignTarget(null)
                            fetchTimelineData()
                        }}
                    />
                )}
            </div>
        </PermissionGuard>
    )
}
