"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { ChevronLeft, ChevronRight, Download, Printer, Clock, Moon, AlertCircle } from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

interface Employee {
  id: string
  code: string
  name: string
  department: string
  // If assigned
  shiftId?: string
  shiftName?: string
  shiftTime?: string
  color?: string
  overnight?: boolean
}

interface ShiftColumn {
  id: string // Template ID
  name: string
  startTime: string
  endTime: string
  color: string
  overnight: boolean
  employees: Employee[]
}

export default function RosterBoardPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shiftColumns, setShiftColumns] = useState<ShiftColumn[]>([])
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

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

      // 1. Fetch Shift Templates (for Columns)
      const { data: templates, error: templateError } = await supabase
        .from('shift_templates')
        .select('*')
        .order('start_time')

      if (templateError) throw templateError

      // Initialize columns from templates
      // Also fetch "fixed" or "general" templates. Rotation templates are patterns, 
      // but for a single day board we mainly care about the distinct shifts available.
      // Update: Include Rotations so they can be assigned targets
      const uniqueShifts = (templates || [])
        // .filter((t: any) => t.type === 'fixed' || !t.type) // OLD: Filtered out rotations
        .filter((t: any) => true) // NEW: Allow all active templates

      const columnsMap = new Map<string, ShiftColumn>()
      uniqueShifts.forEach((t: any) => {
        columnsMap.set(t.name, { // Key by name to catch shifts assigned by name reference
          id: t.id,
          name: t.name,
          startTime: t.type === 'rotation' ? 'Rotation' : (t.start_time || '').slice(0, 5),
          endTime: t.type === 'rotation' ? 'Varies' : (t.end_time || '').slice(0, 5),
          color: t.color || '#DFF0D8',
          overnight: t.overnight || false,
          employees: []
        })
      })

      // 2. Fetch Daily Schedule (who is working where today)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('employee_daily_schedule')
        .select('*')
        .eq('work_date', dateStr)

      if (scheduleError) throw scheduleError

      // 3. Fetch All Employees (for Unassigned pool)
      const { data: allEmployees, error: employeeError } = await supabase
        .from('employee_master')
        .select('id, employee_code, employee_name, department')
        .order('employee_name')

      if (employeeError) throw employeeError

      // Process Logic
      const assignedIds = new Set<string>()

        ; (scheduleData || []).forEach((record: any) => {
          assignedIds.add(record.employee_code)

          // Find existing employee details
          const empDetail = (allEmployees || []).find((e: any) => e.employee_code === record.employee_code)

          if (!empDetail) return // Skip if employee master missing

          const employee: Employee = {
            id: empDetail.employee_code, // Use code as drop ID for consistency
            code: empDetail.employee_code,
            name: empDetail.employee_name,
            department: empDetail.department || 'General',
            // Hydrate ID from Map if missing in record (Zero-Migration Fix)
            shiftId: record.shift_id || columnsMap.get(record.shift_name)?.id,
            shiftName: record.shift_name,
            shiftTime: `${record.shift_start?.slice(0, 5)}-${record.shift_end?.slice(0, 5)}`,
            color: record.color || '#888',
            overnight: record.overnight
          }

          // Add to correct column
          if (columnsMap.has(record.shift_name)) {
            columnsMap.get(record.shift_name)?.employees.push(employee)
          }
        })

      setShiftColumns(Array.from(columnsMap.values()))

      // Identify Unassigned
      const unassigned = (allEmployees || [])
        .filter((e: any) => !assignedIds.has(e.employee_code))
        .map((e: any) => ({
          id: e.employee_code,
          code: e.employee_code,
          name: e.employee_name,
          department: e.department || 'General'
        }))

      setUnassignedEmployees(unassigned)

    } catch (error) {
      console.error('Error fetching roster data:', error)
      alert('Failed to load roster data')
    } finally {
      setLoading(false)
    }
  }

  // --- Drag & Drop Handlers ---

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) return

    const employeeId = active.id as string
    const targetContainer = over.id as string // 'unassigned' or shift_template_id

    // Check if valid move (container changed)
    // We need to find where the employee currently is
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

    // Optimization: If dropped in same container, do nothing
    if (sourceContainer === targetContainer) return
    if (!movedEmployee) return

    // Optimistic Update
    // 1. Remove from source
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

    // 2. Add to target
    if (targetContainer === 'unassigned') {
      setUnassignedEmployees(prev => [...prev, {
        ...movedEmployee!,
        shiftId: undefined,
        shiftName: undefined,
        shiftTime: undefined,
        color: undefined,
        overnight: undefined
      }])

      // API Call: Unassign
      await updateSchedule(employeeId, 'unassign')

    } else {
      // Find target column details from CURRENT state (safe for optimistic update logic)
      const targetCol = shiftColumns.find(c => c.id === targetContainer)
      if (targetCol) {
        setShiftColumns(prev => prev.map(col => {
          if (col.id === targetContainer) {
            // Check if already there to avoid duplicates (safety)
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

        // API Call: Assign
        await updateSchedule(employeeId, 'assign', targetCol.id)
      }
    }
  }

  async function updateSchedule(employeeCode: string, action: 'assign' | 'unassign', shiftId?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/schedule/update', {
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

      if (!response.ok) {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Failed to update schedule:', error)
      alert('Failed to save changes. Please refresh.')
      // In a real app, rollback optimistic update here
      fetchRosterData()
    }
  }

  return (
    <PermissionGuard module="tools_shift" item="Roster Board">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ZohoLayout breadcrumbs={[
          { label: 'Tools', href: '/tools' },
          { label: 'Roster Board' }
        ]}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Daily Roster Board
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Drag and drop employees to assign shifts
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchRosterData()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div >

            {/* Date Selector */}
            < div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4" >
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
            </div >

            {
              loading ? (
                <div className="text-center py-12" >
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p>Loading roster...</p>
                </div>
              ) : (
                <>
                  {/* Dynamic Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
                    {shiftColumns.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        No shift templates found. Go to Shift Manager to create shifts first.
                      </div>
                    ) : (
                      shiftColumns.map(col => (
                        <DroppableColumn key={col.id} id={col.id} title={col.name} columnData={col}>
                          {col.employees.map(emp => (
                            <DraggableEmployee key={emp.id} employee={emp} />
                          ))}
                        </DroppableColumn>
                      ))
                    )}
                  </div>

                  {/* Unassigned Pool */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        📋 Unassigned / Off Duty ({unassignedEmployees.length})
                      </h2>
                    </div>
                    {/* Make unassigned area droppable too */}
                    <DroppableArea id="unassigned">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 min-h-[100px]">
                        {unassignedEmployees.map(emp => (
                          <DraggableEmployee key={emp.id} employee={emp} isCompact />
                        ))}
                      </div>
                    </DroppableArea>
                  </div>
                </>
              )
            }

            <DragOverlay>
              {activeDragId ? (
                <div className="opacity-90 scale-105 cursor-grabbing">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-500">
                    <div className="font-bold text-gray-900 dark:text-white">Moving...</div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>

          </div >
        </ZohoLayout >
      </DndContext >
    </PermissionGuard>
  )
}

// --- Subcomponents ---

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
          {Array.isArray(children) ? children.length : 0} Staff
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

function DraggableEmployee({ employee, isCompact }: { employee: Employee, isCompact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id,
  })

  // Basic styling for transform
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
        backgroundColor: `${employee.color}20` || 'rgba(255,255,255,0.5)'
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
