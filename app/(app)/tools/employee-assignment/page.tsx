"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
// import removed
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { AssignScheduleModal } from './AssignScheduleModal'
import {
  User,
  Search,
  Clock,
  Calendar,
  MoreVertical,
  Edit,
  Moon,
  ChevronRight,
  LayoutGrid,
  X,
  Loader2,
  ChevronLeft,
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
    startDate?: string
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
  const [refreshKey, setRefreshKey] = useState(0)

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
              type: activeAssignment?.assignment_type || 'fixed',
              shiftName: todayShift.shift_name,
              timeRange: `${todayShift.shift_start?.slice(0, 5)} - ${todayShift.shift_end?.slice(0, 5)}`,
              color: todayShift.color || '#3B82F6',
              overnight: todayShift.overnight,
              shiftId: activeAssignment?.shift_template?.id || todayShift.shift_id,
              startDate: activeAssignment?.start_date
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
              shiftId: t.id,
              startDate: activeAssignment.start_date
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

      // Sync selected employee if one is active
      if (selectedEmployeeId) {
        const refreshed = empList.find(e => e.id === selectedEmployeeId)
        if (!refreshed) { // If the previously selected employee is no longer in the list, clear selection
          setSelectedEmployeeId(null)
        }
      }

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
    <PermissionGuard module="tools_shift" item="Shift Management">
      <div className="h-full w-full p-6">
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setRefreshKey(prev => prev + 1)
                        fetchEmployees()
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      title="Refresh Data"
                    >
                      <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm shadow-blue-200 dark:shadow-none transition-all active:scale-95"
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

                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <LayoutGrid className="w-8 h-8 mb-2 opacity-30" />
                          <p>No active assignment</p>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Upcoming Schedule (Real Data) */}
                    <UpcomingScheduleWidget
                      key={`widget-${selectedEmployee.code}-${refreshKey}`}
                      employeeId={selectedEmployee.code}
                      refreshKey={refreshKey}
                      onViewAll={() => setShowScheduleModal(true)}
                    />
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
          <AssignScheduleModal
            employees={[selectedEmployee]}
            onClose={() => setShowAssignModal(false)}
            onSave={() => {
              setShowAssignModal(false)
              setRefreshKey(prev => prev + 1)
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

      </div>
    </PermissionGuard>
  )
}

// Update Widget definition to accept onViewAll
function UpcomingScheduleWidget({ employeeId, refreshKey, onViewAll }: {
  employeeId: string,
  refreshKey: number,
  onViewAll: () => void
}) {
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
          const res = await fetch(`/api/schedule/employee?employee_code=${employeeId}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&t=${Date.now()}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            cache: 'no-store'
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
  }, [employeeId, refreshKey])

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Upcoming Schedule</h3>
        <button onClick={onViewAll} className="text-xs text-blue-500 hover:text-blue-400 font-medium">View All</button>
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
              <div key={i} onClick={onViewAll} className="flex items-center gap-4 cursor-pointer group">
                <div className="flex flex-col items-center min-w-[3rem]">
                  <span className="text-xs text-gray-400 font-medium">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{date.getDate()}</span>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2">
                      {day.shift_name}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
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

function ScheduleViewModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Look 1 month around current month
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const from = startOfMonth.toISOString().split('T')[0]
      const to = endOfMonth.toISOString().split('T')[0]

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/schedule/employee?employee_code=${employee.code}&from=${from}&to=${to}`, {
          headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {}
        })
        const data = await res.json()
        if (data.success) setSchedule(data.data.schedule)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [employee, currentMonth])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const days = []
  // Padding for first week
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4 transition-all duration-500" onClick={onClose}>
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[1.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-white/20 dark:border-gray-800/50 overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>

        {/* Compact Header */}
        <div className="px-5 py-4 border-b border-gray-100/50 dark:border-gray-800/30 flex justify-between items-center bg-white/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${employee.avatarColor} flex items-center justify-center text-white font-black text-base shadow-sm ring-2 ring-white dark:ring-gray-800`}>
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">{employee.name}</h2>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg overflow-hidden shadow-sm mr-2">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 transition-all border-r border-gray-200/50 dark:border-gray-700/50 group active:scale-90">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
              </button>
              <div className="px-3 py-1 text-[10px] font-black min-w-[5rem] text-center flex items-center justify-center uppercase tracking-tighter">
                {currentMonth.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 transition-all group active:scale-90">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all group active:scale-95">
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Compact Calendar Body */}
        <div className="flex-1 p-5 pt-2 relative bg-transparent overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="absolute inset-0 bg-white/30 dark:bg-gray-900/30 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}

          {/* Week Header */}
          <div className="grid grid-cols-7 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>

          {/* Tight Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="aspect-square opacity-0" />

              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const shift = schedule.find(s => s.date === dateStr)
              const isToday = new Date().toISOString().split('T')[0] === dateStr

              return (
                <div
                  key={day}
                  className={`aspect-square p-1.5 rounded-2xl border flex flex-col relative transition-all duration-300 group ${isToday
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
                    : 'border-transparent bg-white dark:bg-gray-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                >
                  {/* Compact Day Number */}
                  <span className={`text-[10px] font-black absolute top-1.5 right-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-200 dark:text-gray-700 group-hover:text-blue-300'} transition-colors`}>
                    {day}
                  </span>

                  {shift ? (
                    <div className="flex-1 flex flex-col justify-end gap-1">
                      <div
                        className="w-full h-1.5 rounded-full shadow-sm transform transition-all group-hover:scale-y-125"
                        style={{
                          backgroundColor: shift.color,
                          boxShadow: `0 2px 6px ${shift.color}33`
                        }}
                        title={`${shift.shift_name}\n${shift.start_time?.slice(0, 5)} - ${shift.end_time?.slice(0, 5)}`}
                      />
                      <div className="text-[8px] font-black text-gray-400 dark:text-gray-500 font-mono text-center truncate uppercase tracking-tighter">
                        {shift.shift_name?.split(' ')[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-1 h-1 rounded-full bg-blue-100 dark:bg-blue-900/30" />
                    </div>
                  )}

                  {isToday && (
                    <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
              )
            })}
          </div>

          {!loading && schedule.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 py-10 border-2 border-dashed border-gray-50 dark:border-gray-800 rounded-2xl">
              <p className="text-xs font-black tracking-widest opacity-40 uppercase">No Shifts</p>
            </div>
          )}
        </div>

        {/* Minimized Legend */}
        <div className="px-5 py-3 bg-white/30 dark:bg-gray-950/30 backdrop-blur-md border-t border-gray-100/50 dark:border-gray-800/30 flex justify-center gap-5">
          {[
            { label: 'Off', color: 'bg-gray-200' },
            { label: 'Work', color: 'bg-blue-500' },
            { label: 'Today', color: 'ring-1 ring-blue-500' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
