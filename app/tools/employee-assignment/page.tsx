"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import {
  User, Search, MapPin, Clock, Calendar,
  MoreVertical, Edit, Eye, Plane, Moon, Sun,
  CheckCircle2, AlertCircle, ChevronRight, LayoutGrid,
  X, Check, Loader2
} from 'lucide-react'

// Types
interface Employee {
  id: string
  code: string
  name: string
  department: string
  role: string
  status: 'active' | 'on_leave' | 'inactive'
  avatarColor: string
  currentAssignment?: {
    type: 'fixed' | 'rotation'
    shiftName: string
    timeRange: string
    color: string
    overnight?: boolean
    currentWeek?: number
    shiftId?: string
  }
}

export default function EmployeeAssignmentPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const supabase = getSupabaseBrowserClient()

  // Initial Fetch
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Filter Logic
  useEffect(() => {
    const lowerQ = searchQuery.toLowerCase()
    const filtered = employees.filter(e =>
      e.name.toLowerCase().includes(lowerQ) ||
      e.code.toLowerCase().includes(lowerQ) ||
      e.department.toLowerCase().includes(lowerQ)
    )
    setFilteredEmployees(filtered)
  }, [searchQuery, employees])


  async function fetchEmployees() {
    try {
      setLoading(true)
      const { data: rawLogs, error } = await supabase
        .from('employee_master')
        .select('*')
        .order('employee_code')

      if (error) throw error

      // Get Active Assignments
      const { data: assignments } = await supabase
        .from('employee_shift_assignments')
        .select(`
          employee_code,
          assignment_type,
          shift_template:shift_templates(id, name, start_time, end_time, color, overnight, type, pattern),
          rotation_profile_id,
          start_date,
          end_date
        `)
        .is('end_date', null) // Only active assignments

      const assignmentMap = new Map()
      assignments?.forEach((a: any) => assignmentMap.set(a.employee_code, a))

      // Get today's schedule for "Real-time Status" check
      const today = new Date().toISOString().split('T')[0]
      const { data: scheduleData } = await supabase
        .from('employee_daily_schedule')
        .select('*')
        .eq('work_date', today)

      const scheduleMap = new Map()
      scheduleData?.forEach((s: any) => scheduleMap.set(s.employee_code, s))

      const uniqueEmployees = new Map<string, Employee>()

      rawLogs?.forEach((emp: any) => {
        if (!uniqueEmployees.has(emp.employee_code)) {
          const activeAssignment = assignmentMap.get(emp.employee_code)
          const todayShift = scheduleMap.get(emp.employee_code)

          let currentAssignment = undefined

          // Priority 1: Today's Daily Schedule (Most Accurate)
          if (todayShift) {
            currentAssignment = {
              type: 'fixed',
              shiftName: todayShift.shift_name,
              timeRange: `${todayShift.shift_start?.slice(0, 5)} - ${todayShift.shift_end?.slice(0, 5)}`,
              color: todayShift.color || '#3B82F6',
              overnight: todayShift.overnight,
              shiftId: todayShift.shift_id
            }
          }
          // Priority 2: Active Assignment Template (Fallback)
          else if (activeAssignment?.shift_template) {
            const t = activeAssignment.shift_template
            currentAssignment = {
              type: activeAssignment.assignment_type || 'fixed',
              shiftName: t.name,
              timeRange: t.type === 'rotation' ? 'Rotating Pattern' : `${t.start_time?.slice(0, 5)} - ${t.end_time?.slice(0, 5)}`,
              color: t.color,
              overnight: t.overnight,
              shiftId: t.id
            }
          }

          uniqueEmployees.set(emp.employee_code, {
            id: emp.employee_code,
            code: emp.employee_code,
            name: emp.employee_name || emp.name || emp.employee_code,
            department: emp.department || 'General',
            role: emp.role || 'Staff',
            status: activeAssignment ? 'active' : 'inactive',
            avatarColor: ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][Math.floor(Math.random() * 5)],
            currentAssignment: currentAssignment as any
          })
        }
      })

      const empList = Array.from(uniqueEmployees.values())
      setEmployees(empList)
      setFilteredEmployees(empList)

      // Select first employee by default if none selected
      if (empList.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(empList[0].id)
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId)

  return (
    <PermissionGuard module="tools_shift" item="Employee Assignment">
      <ZohoLayout breadcrumbs={[{ label: 'Tools' }, { label: 'Employee Assignment' }]}>
        <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">

          {/* Left Panel: Employee List */}
          <div className="w-1/3 min-w-[320px] flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`group p-3 rounded-xl cursor-pointer border transition-all duration-200 flex items-center gap-3 relative overflow-hidden ${selectedEmployeeId === emp.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 shadow-md'
                    : 'bg-white dark:bg-gray-800/50 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                >
                  {/* Selection Indicator */}
                  {selectedEmployeeId === emp.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                  )}

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${emp.avatarColor}`}>
                    {emp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${selectedEmployeeId === emp.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'}`}>
                      {emp.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.role} • {emp.department}</p>
                  </div>
                  {/* Status Dot */}
                  <div className={`w-2 h-2 rounded-full ${emp.currentAssignment ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Detailed Dashboard */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden relative">
            {selectedEmployee ? (
              <>
                {/* Background Gradient Decoration */}
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-800/50 pointer-events-none" />

                {/* Header Section */}
                <div className="p-8 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                      <div className={`w-24 h-24 rounded-2xl ${selectedEmployee.avatarColor} shadow-2xl flex items-center justify-center text-4xl text-white font-bold ring-4 ring-white dark:ring-gray-900`}>
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedEmployee.name}</h1>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium">
                            {selectedEmployee.role}
                          </span>
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 px-2.5 py-0.5 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-4 mt-8">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Assignment
                    </button>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-all active:scale-95"
                    >
                      <Calendar className="w-4 h-4" />
                      View Schedule
                    </button>
                    <button
                      onClick={() => alert("Leave Management module coming soon!")}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-medium transition-all active:scale-95"
                    >
                      <Plane className="w-4 h-4" />
                      Request Leave
                    </button>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="flex-1 bg-gray-50/50 dark:bg-gray-950/30 p-8 pt-0 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                    {/* Card 1: Current Assignment */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-24 h-24" />
                      </div>

                      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Current Assignment</h3>

                      {selectedEmployee.currentAssignment ? (
                        <div className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {selectedEmployee.currentAssignment.type === 'rotation' ? 'Rotating' : 'Fixed Shift'}
                            </span>
                          </div>
                          <h2
                            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-1"
                          >
                            {selectedEmployee.currentAssignment.shiftName}
                          </h2>
                          <p className="text-lg text-gray-500 dark:text-gray-400 font-mono flex items-center gap-2">
                            {selectedEmployee.currentAssignment.timeRange}
                            {selectedEmployee.currentAssignment.overnight && <Moon className="w-4 h-4 text-indigo-400" />}
                          </p>

                          {/* Visual Progress Bar (Mock) */}
                          <div className="mt-6">
                            <div className="flex justifies-between text-xs text-gray-400 mb-1">
                              <span>Shift Progress</span>
                              <span>65%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <LayoutGrid className="w-8 h-8 mb-2 opacity-30" />
                          <p>No active assignment</p>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Upcoming Schedule (Real Data) */}
                    <UpcomingScheduleWidget employeeId={selectedEmployee.code} />

                    {/* Card 3: Stats / Attendance (Simple Visual) */}
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CheckCircle2 className="w-32 h-32" />
                      </div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <h3 className="text-indigo-100 text-sm font-medium mb-1">Weekly Attendance Score</h3>
                          <div className="text-4xl font-bold mb-2">98%</div>
                          <p className="text-indigo-100 text-sm opacity-80">Excellent punctuality this week. Keep it up!</p>
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
                          <span className="font-bold text-xl">A+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50 dark:bg-gray-950/20">
                <User className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select an employee to view details</p>
              </div>
            )}
          </div>
        </div>

        {showAssignModal && selectedEmployee && (
          <AssignmentModal
            employees={[selectedEmployee]}
            onClose={() => setShowAssignModal(false)}
            onSave={() => {
              setShowAssignModal(false)
              fetchEmployees()
            }}
          />
        )}

        {showScheduleModal && selectedEmployee && (
          <ScheduleViewModal
            employee={selectedEmployee}
            onClose={() => setShowScheduleModal(false)}
          />
        )}

      </ZohoLayout>
    </PermissionGuard>
  )
}

function UpcomingScheduleWidget({ employeeId }: { employeeId: string }) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function fetchUpcoming() {
      setLoading(true)
      const from = new Date()
      from.setDate(from.getDate() + 1) // Start from tomorrow
      const to = new Date()
      to.setDate(to.getDate() + 3) // Next 3 days

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch(`/api/schedule/employee?employee_code=${employeeId}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          const result = await res.json()
          if (result.success) setSchedule(result.data.schedule)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (employeeId) fetchUpcoming()
  }, [employeeId])

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Upcoming Schedule</h3>
        <button className="text-xs text-blue-500 hover:text-blue-400 font-medium">View All</button>
      </div>

      <div className="space-y-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : schedule.length > 0 ? (
          schedule.slice(0, 3).map((day, i) => {
            const date = new Date(day.date)
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center min-w-[3rem]">
                  <span className="text-xs text-gray-400 font-medium">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{date.getDate()}</span>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2">
                      {day.shift_name}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.start_time?.slice(0, 5)} - {day.end_time?.slice(0, 5)}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Calendar className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No upcoming shifts</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Restored Components ---

function AssignmentModal({ employees, onClose, onSave }: {
  employees: Employee[]
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [selectedShift, setSelectedShift] = useState('')
  const [shiftType, setShiftType] = useState<'fixed' | 'rotation'>('fixed')
  const [startDate, setStartDate] = useState('')

  const [shifts, setShifts] = useState<any[]>([])
  const [rotations, setRotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function fetchShifts() {
      setLoading(true)
      const { data } = await supabase.from('shift_templates').select('*').order('created_at', { ascending: false })
      if (data) {
        setShifts(data.filter((t: any) => t.type === 'fixed' || (!t.type && !t.pattern)))
        setRotations(data.filter((t: any) => t.type === 'rotation'))
      }
      setLoading(false)
    }
    fetchShifts()
    fetchShifts()
  }, [])

  // Pre-select current assignment
  useEffect(() => {
    if (employees.length === 1 && employees[0].currentAssignment?.shiftId) {
      const current = employees[0].currentAssignment
      // Only set if we haven't manually selected something yet (initial load)
      if (!selectedShift && current.shiftId) {
        setShiftType(current.type)
        setSelectedShift(current.shiftId)
      }
    }
  }, [employees, shifts, rotations]) // Re-run when shifts load so we can match IDs if needed

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return alert('Please login first')

      const response = await fetch('/api/assignments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employees: employees.map(e => e.code),
          shiftType,
          shiftId: selectedShift,
          startDate
        })
      })

      const result = await response.json()
      if (result.success) onSave(result.data)
      else alert(`Failed: ${result.error}`)
    } catch (error) {
      console.error(error)
      alert('Error saving assignment')
    }
  }

  const items = shiftType === 'fixed' ? shifts : rotations

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assigning to <span className="font-semibold text-gray-900 dark:text-white">{employees[0].name}</span>
              {employees.length > 1 && ` + ${employees.length - 1} others`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Step 1: Shift Type */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">1. Select Assignment Type</label>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {['fixed', 'rotation'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setShiftType(t as any); setSelectedShift('') }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${shiftType === t
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300 ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {t === 'fixed' ? 'Fixed Shift' : 'Rotating Pattern'}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Choose Template */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">2. Choose Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <div className="col-span-2 flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : items.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-400 text-sm italic">No templates found</div>
              ) : (
                items.map(shift => (
                  <button
                    key={shift.id}
                    onClick={() => setSelectedShift(shift.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all hover:border-blue-300 dark:hover:border-blue-700 group ${selectedShift === shift.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`w-2 h-8 rounded-full ${selectedShift === shift.id ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ backgroundColor: selectedShift === shift.id ? undefined : shift.color }} />
                      {selectedShift === shift.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 mb-0.5">{shift.name}</div>
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {shiftType === 'rotation' ? `${shift.pattern?.length || '?'} Week Cycle` : `${shift.start_time?.slice(0, 5)} - ${shift.end_time?.slice(0, 5)}`}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">3. Duration</label>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 rounded-b-2xl bg-gray-50/50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedShift || !startDate}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduleViewModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Look 2 weeks ahead
      const from = new Date();
      const to = new Date(); to.setDate(to.getDate() + 14);

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {}

        const res = await fetch(`/api/schedule/employee?employee_code=${employee.code}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`, {
          headers
        })
        const data = await res.json()
        if (data.success) setSchedule(data.data.schedule)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [employee])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Schedule Viewer</h2>
            <p className="text-sm text-gray-500">{employee.name} ({employee.code})</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-950/30">
          {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedule.map(day => (
                <div key={day.date} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-sm text-gray-500 font-medium mb-1">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <div className="font-bold text-lg mb-2" style={{ color: day.color }}>{day.shift_name}</div>
                  <div className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{day.start_time?.slice(0, 5)} - {day.end_time?.slice(0, 5)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && schedule.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Calendar className="w-12 h-12 mb-2 opacity-20" />
              <p>No schedule found for the next 14 days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
