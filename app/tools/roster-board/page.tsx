"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { ChevronLeft, ChevronRight, Download, Printer, Clock, Moon, AlertCircle } from 'lucide-react'
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

    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        fetchRosterData()
    }, [currentDate])

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

    async function fetchRosterData() {
        try {
            setLoading(true)
            const dateStr = currentDate.toISOString().split('T')[0]

            // 1. Fetch Shift Templates (to define the board structure)
            const { data: templates, error: templateError } = await supabase
                .from('shift_templates')
                .select('*')
                .order('start_time')

            if (templateError) throw templateError

            const columnsMap = new Map<string, ShiftColumn>()
                ; (templates || []).forEach((t: any) => {
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

            const response = await fetch(`/api/schedule/roster?date=${dateStr}`, {
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

            setShiftColumns(Array.from(columnsMap.values()))
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
            await updateSchedule(employeeId, 'unassign')
        } else {
            const targetCol = shiftColumns.find(c => c.id === targetContainer)
            if (targetCol) {
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
                await updateSchedule(employeeId, 'assign', targetCol.id)
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

    return (
        <PermissionGuard module="tools_shift" item="Roster Board">
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                autoScroll={false}
            >
                <ZohoLayout breadcrumbs={[
                    { label: 'Tools', href: '/tools' },
                    { label: 'Roster Board' }
                ]}>
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

                                <div className="flex gap-2">
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
                </ZohoLayout>
            </DndContext>
        </PermissionGuard>
    )
}
