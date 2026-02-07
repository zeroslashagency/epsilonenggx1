"use client"

import { useState, useEffect, useRef } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
// import removed
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { ChevronLeft, ChevronRight, Download, Clock, Moon } from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core'

interface Employee {
    id: string
    code: string
    name: string
    department: string
    shiftId?: string
    shiftName?: string
    shiftTime?: string
    color?: string
    overnight?: boolean
}

interface ShiftColumn {
    id: string
    name: string
    startTime: string
    endTime: string
    color: string
    overnight: boolean
    employees: Employee[]
}

// --- Subcomponents ---

function DraggableEmployee({ employee, isCompact }: { employee: Employee, isCompact?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: employee.id,
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : undefined

    if (isCompact) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={`p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center cursor-move hover:shadow-md hover:border-blue-400 transition-all ${isDragging ? 'opacity-30' : ''}`}
            >
                <div className="font-medium text-gray-900 dark:text-white text-sm truncate" title={employee.name}>{employee.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{employee.code}</div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                backgroundColor: employee.color ? `${employee.color}20` : 'rgba(255,255,255,0.5)'
            }}
            {...listeners}
            {...attributes}
            className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md hover:border-blue-400 transition-all ${isDragging ? 'opacity-30' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        👤 {employee.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{employee.code}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{employee.department}</div>
                </div>
            </div>
        </div>
    )
}

function DroppableColumn({ id, title, columnData, children }: { id: string, title: string, columnData: ShiftColumn, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id })

    return (
        <div
            ref={setNodeRef}
            className={`bg-white dark:bg-gray-900 rounded-lg border-2 transition-colors overflow-hidden flex flex-col h-full min-h-[300px] ${isOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-800'}`}
        >
            <div
                className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"
                style={{ borderTop: `4px solid ${columnData.color}` }}
            >
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {columnData.startTime} - {columnData.endTime}
                    {columnData.overnight && <Moon className="w-3 h-3 text-blue-500 ml-1" />}
                </div>
                <div className="text-xs text-right text-gray-400 font-mono mt-1">
                    {columnData.employees.length} Staff
                </div>
            </div>
            <div className="p-3 space-y-2 flex-1 relative">
                {children}
                {(!children || (Array.isArray(children) && children.length === 0)) && (
                    <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}

function DroppableArea({ id, children }: { id: string, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id })
    return (
        <div
            ref={setNodeRef}
            className={`p-6 transition-colors ${isOver ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
        >
            {children}
        </div>
    )
}

// --- Main Page Component ---

export default function RosterBoardPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [shiftColumns, setShiftColumns] = useState<ShiftColumn[]>([])
    const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [assignmentMode, setAssignmentMode] = useState<'persistent' | 'day'>('persistent')
    const [departmentFilter, setDepartmentFilter] = useState('all')
    const [availableDepartments, setAvailableDepartments] = useState<string[]>([])
    const [coverageSummary, setCoverageSummary] = useState({ total: 0, onDuty: 0, off: 0 })
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        fetchRosterData()
    }, [currentDate, departmentFilter])

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const previousDay = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() - 1)
        setCurrentDate(newDate)
    }

    const nextDay = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + 1)
        setCurrentDate(newDate)
    }

    const scheduleRefresh = () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(() => {
            fetchRosterData()
        }, 600)
    }

    useEffect(() => {
        const channel = supabase
            .channel('roster-board-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_daily_schedule' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_shift_assignments' }, scheduleRefresh)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentDate, departmentFilter])

    async function fetchRosterData() {
        try {
            setLoading(true)
            const dateStr = currentDate.toISOString().split('T')[0]

            const params = new URLSearchParams({ date: dateStr })
            if (departmentFilter && departmentFilter !== 'all') {
                params.set('department', departmentFilter)
            }
            params.set('include_overrides', 'true')
            params.set('include_holidays', 'true')

            // 1. Fetch Shift Templates (to define the board structure)
            const { data: templates, error: templateError } = await supabase
                .from('shift_templates')
                .select('*')
                .order('start_time')

            if (templateError) throw templateError

            const columnsMap = new Map<string, ShiftColumn>()
                ; (templates || []).filter((t: any) => !t.is_archived).forEach((t: any) => {
                    columnsMap.set(t.name, {
                        id: t.id,
                        name: t.name,
                        startTime: t.type === 'rotation' ? 'Rotation' : (t.start_time || '').slice(0, 5),
                        endTime: t.type === 'rotation' ? 'Varies' : (t.end_time || '').slice(0, 5),
                        color: t.color || '#DFF0D8',
                        overnight: t.overnight || false,
                        employees: []
                    })
                })

            // 2. Fetch Unified Roster Data from API
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch(`/api/schedule/roster?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })
            const result = await response.json()
            if (!result.success) throw new Error(result.error)

            const rosterData = result.data
            const unassigned: Employee[] = []

            rosterData.forEach((item: any) => {
                const employee: Employee = {
                    id: item.employee_code,
                    code: item.employee_code,
                    name: item.employee_name,
                    department: item.department || 'General',
                    shiftId: item.shift?.id,
                    shiftName: item.shift?.name,
                    shiftTime: item.shift?.start_time ? `${item.shift.start_time.slice(0, 5)}-${item.shift.end_time?.slice(0, 5)}` : undefined,
                    color: item.shift?.color || '#888',
                    overnight: item.shift?.overnight
                }

                // Match by ID primarily, then by name as fallback
                const targetCol = item.shift ?
                    (Array.from(columnsMap.values()).find(c => c.id === item.shift.id) ||
                        columnsMap.get(item.shift.name))
                    : null

                if (targetCol) {
                    targetCol.employees.push(employee)
                } else {
                    unassigned.push(employee)
                }
            })

            const departmentSet = new Set<string>()
            rosterData.forEach((item: any) => {
                if (item.department) departmentSet.add(item.department)
            })

            const columns = Array.from(columnsMap.values())
            const onDuty = columns.reduce((sum, col) => sum + col.employees.length, 0)
            const offDuty = unassigned.length

            setAvailableDepartments(Array.from(departmentSet).sort())
            setCoverageSummary({ total: onDuty + offDuty, onDuty, off: offDuty })
            setShiftColumns(columns)
            setUnassignedEmployees(unassigned)

        } catch (error) {
            console.error('Error fetching roster data:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveDragId(event.active.id as string)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveDragId(null)

        if (!isEditMode) return
        if (!over) return

        const employeeId = active.id as string
        const targetContainer = over.id as string

        let sourceContainer = 'unassigned'
        let movedEmployee: Employee | undefined

        if (unassignedEmployees.find(e => e.id === employeeId)) {
            sourceContainer = 'unassigned'
            movedEmployee = unassignedEmployees.find(e => e.id === employeeId)
        } else {
            for (const col of shiftColumns) {
                const emp = col.employees.find(e => e.id === employeeId)
                if (emp) {
                    sourceContainer = col.id
                    movedEmployee = emp
                    break
                }
            }
        }

        if (sourceContainer === targetContainer) return
        if (!movedEmployee) return

        if (movedEmployee.shiftId && targetContainer !== 'unassigned' && movedEmployee.shiftId !== targetContainer) {
            const proceed = confirm('This will replace the existing shift assignment. Continue?')
            if (!proceed) return
        }

        // Optimistic UI updates
        if (sourceContainer === 'unassigned') {
            setUnassignedEmployees(prev => prev.filter(e => e.id !== employeeId))
        } else {
            setShiftColumns(prev => prev.map(col => {
                if (col.id === sourceContainer) {
                    return { ...col, employees: col.employees.filter(e => e.id !== employeeId) }
                }
                return col
            }))
        }

        if (targetContainer === 'unassigned') {
            setUnassignedEmployees(prev => [...prev, {
                ...movedEmployee!,
                shiftId: undefined,
                shiftName: undefined,
                shiftTime: undefined,
                color: undefined,
                overnight: undefined
            }])
            if (assignmentMode === 'day') {
                await updateDailyOverride(employeeId, 'assign', undefined, {
                    id: null,
                    name: 'Unassigned',
                    startTime: '00:00',
                    endTime: '00:00',
                    color: '#9CA3AF',
                    overnight: false
                })
            } else {
                await updateSchedule(employeeId, 'unassign')
            }
        } else {
            const targetCol = shiftColumns.find(c => c.id === targetContainer)
            if (targetCol) {
                if (assignmentMode === 'day' && (!targetCol.startTime?.includes(':') || !targetCol.endTime?.includes(':'))) {
                    alert('Day-only assignments require a fixed shift with start/end times.')
                    fetchRosterData()
                    return
                }
                setShiftColumns(prev => prev.map(col => {
                    if (col.id === targetContainer) {
                        if (col.employees.find(e => e.id === employeeId)) return col;
                        return {
                            ...col,
                            employees: [...col.employees, {
                                ...movedEmployee!,
                                shiftId: targetCol.id,
                                shiftName: targetCol.name,
                                shiftTime: `${targetCol.startTime}-${targetCol.endTime}`,
                                color: targetCol.color,
                                overnight: targetCol.overnight
                            }]
                        }
                    }
                    return col
                }))
                if (assignmentMode === 'day') {
                    await updateDailyOverride(employeeId, 'assign', targetCol)
                } else {
                    await updateSchedule(employeeId, 'assign', targetCol.id)
                }
            }
        }
    }

    async function updateSchedule(employeeCode: string, action: 'assign' | 'unassign', shiftId?: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const endpoint = '/api/assignments/update'

            await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    employee_code: employeeCode,
                    work_date: currentDate.toISOString().split('T')[0],
                    action,
                    shift_id: shiftId
                })
            })
        } catch (error) {
            console.error('Failed to update schedule:', error)
            fetchRosterData()
        }
    }

    async function updateDailyOverride(
        employeeCode: string,
        action: 'assign' | 'clear',
        shift?: ShiftColumn,
        overrideShift?: { id: string | null; name: string; startTime: string; endTime: string; color?: string; overnight?: boolean }
    ) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const payload: any = {
                employee_code: employeeCode,
                work_date: currentDate.toISOString().split('T')[0],
                action
            }

            if (action === 'assign') {
                const targetShift = overrideShift || shift
                if (targetShift) {
                    payload.shift_id = targetShift.id
                    payload.shift_name = targetShift.name
                    if (targetShift.startTime?.includes(':')) payload.shift_start = targetShift.startTime
                    if (targetShift.endTime?.includes(':')) payload.shift_end = targetShift.endTime
                    payload.color = targetShift.color
                    payload.overnight = targetShift.overnight
                }
            }

            await fetch('/api/schedule/override', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            })
        } catch (error) {
            console.error('Failed to update daily override:', error)
            fetchRosterData()
        }
    }

    function exportRosterCsv() {
        const dateStr = currentDate.toISOString().split('T')[0]
        const rows = [['Date', 'Employee Code', 'Employee Name', 'Department', 'Shift', 'Start', 'End']]

        shiftColumns.forEach(col => {
            col.employees.forEach(emp => {
                rows.push([
                    dateStr,
                    emp.code,
                    emp.name,
                    emp.department,
                    col.name,
                    col.startTime,
                    col.endTime
                ])
            })
        })

        unassignedEmployees.forEach(emp => {
            rows.push([dateStr, emp.code, emp.name, emp.department, 'Unassigned', '', ''])
        })

        const csv = rows.map(r => r.map(value => `"${String(value).replace(/\"/g, '\"\"')}"`).join(',')).join('\\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `roster-${dateStr}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <PermissionGuard module="tools_shift" item="Shift Management">
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                autoScroll={false}
            >
                <div className="h-full w-full p-4 md:p-6">
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                    Daily Roster Board
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Drag and drop employees to assign shifts
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Edit Access</span>
                                        <span className={`text-sm font-bold ${isEditMode ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {isEditMode ? '🔓 Unlocked (Edit)' : '🔒 Locked (View)'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsEditMode(!isEditMode)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEditMode ? 'bg-red-600' : 'bg-green-600'
                                            }`}
                                    >
                                        <span
                                            className={`${isEditMode ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Assignment Mode</span>
                                        <span className={`text-sm font-bold ${assignmentMode === 'persistent' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            {assignmentMode === 'persistent' ? 'Persistent' : 'Day Only'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setAssignmentMode(assignmentMode === 'persistent' ? 'day' : 'persistent')}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${assignmentMode === 'persistent' ? 'bg-blue-600' : 'bg-amber-500'
                                            }`}
                                    >
                                        <span
                                            className={`${assignmentMode === 'persistent' ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={exportRosterCsv}
                                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => fetchRosterData()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
                                        disabled={loading}
                                    >
                                        {loading ? 'Refreshing...' : 'Refresh Data'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                            <div className="flex items-center justify-between">
                                <button onClick={previousDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatDate(currentDate)}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                    </div>
                                </div>
                                <button onClick={nextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Department</span>
                                <select
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                    className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                >
                                    <option value="all">All</option>
                                    {availableDepartments.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Coverage Summary
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div className="font-semibold text-gray-900 dark:text-white">Total: {coverageSummary.total}</div>
                                    <div className="font-semibold text-green-600 dark:text-green-400">On Duty: {coverageSummary.onDuty}</div>
                                    <div className="font-semibold text-gray-500 dark:text-gray-400">Off/Unassigned: {coverageSummary.off}</div>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                                <p>Loading roster...</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
                                    {shiftColumns.length === 0 ? (
                                        <div className="col-span-full text-center py-8 text-gray-500">
                                            No shift templates found.
                                        </div>
                                    ) : (
                                        shiftColumns.map(col => (
                                            <DroppableColumn key={col.id} id={col.id} title={col.name} columnData={col}>
                                                {col.employees.map(emp => (
                                                    <DraggableEmployee key={emp.id} employee={emp} />
                                                ))}
                                                {/* Edit Overlay Block */}
                                                {!isEditMode && (
                                                    <div className="absolute inset-0 bg-gray-50/10 dark:bg-transparent z-[5] cursor-not-allowed" title="Unlock Edit Mode to move staff" />
                                                )}
                                            </DroppableColumn>
                                        ))
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 relative">
                                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            📋 Unassigned / Off Duty ({unassignedEmployees.length})
                                        </h2>
                                    </div>
                                    <DroppableArea id="unassigned">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 min-h-[100px]">
                                            {unassignedEmployees.map(emp => (
                                                <DraggableEmployee key={emp.id} employee={emp} isCompact />
                                            ))}
                                        </div>
                                    </DroppableArea>
                                    {!isEditMode && (
                                        <div className="absolute inset-0 bg-gray-50/10 dark:bg-transparent z-[5] cursor-not-allowed" />
                                    )}
                                </div>
                            </>
                        )}

                        <DragOverlay>
                            {activeDragId ? (
                                <div className="opacity-90 scale-105 cursor-grabbing">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-500">
                                        <div className="font-bold text-gray-900 dark:text-white">Moving...</div>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </div>
                </div>
            </DndContext>
        </PermissionGuard>
    )
}
