"use client"

import { useEffect, useState } from 'react'
import { Calendar, CheckCircle2, Clock, Loader2, Trash2, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { useToast } from '@/app/lib/contexts/toast-context'

export type AssignScheduleEmployee = {
  code: string
  name: string
  currentAssignment?: {
    type: 'fixed' | 'rotation'
    shiftId?: string
    startDate?: string
  }
}

type AssignScheduleModalProps = {
  employees: AssignScheduleEmployee[]
  onClose: () => void
  onSave: (data: any) => void
  initialStartDate?: string
}

export function AssignScheduleModal({
  employees,
  onClose,
  onSave,
  initialStartDate,
}: AssignScheduleModalProps) {
  const [selectedShift, setSelectedShift] = useState('')
  const [shiftType, setShiftType] = useState<'fixed' | 'rotation'>('fixed')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const [shifts, setShifts] = useState<any[]>([])
  const [rotations, setRotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()
  const { showToast } = useToast()

  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate)
    }
  }, [initialStartDate])

  useEffect(() => {
    async function fetchShifts() {
      setLoading(true)
      const { data } = await supabase.from('shift_templates').select('*').order('created_at', { ascending: false })
      if (data) {
        const activeTemplates = data.filter((t: any) => !t.is_archived)
        setShifts(activeTemplates.filter((t: any) => t.type === 'fixed' || (!t.type && !t.pattern)))
        setRotations(activeTemplates.filter((t: any) => t.type === 'rotation'))
      }
      setLoading(false)
    }
    fetchShifts()
  }, [])

  useEffect(() => {
    if (employees.length === 1 && employees[0].currentAssignment?.shiftId) {
      const current = employees[0].currentAssignment
      if (!selectedShift && current.shiftId) {
        setShiftType(current.type)
        setSelectedShift(current.shiftId)
      }
    }
  }, [employees, shifts, rotations, selectedShift])

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('error', 'Please login first')
        return
      }

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
      if (result.success) {
        if (result.warnings && result.warnings.length > 0) {
          const summary = result.warnings
            .slice(0, 5)
            .map((w: any) => `${w.employee_code}: ${w.type}`)
            .join(', ')
          showToast('warning', `Assignment warnings (${result.warnings.length}): ${summary}`)
        }
        onSave(result.data)
      } else {
        showToast('error', `Failed: ${result.error}`)
      }
    } catch (error) {
      console.error(error)
      showToast('error', 'Error saving assignment')
    }
  }

  const handleUnassign = async () => {
    if (!confirm("Are you sure you want to unassign this employee? This will clear all future schedules.")) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('error', 'Please login first')
        return
      }

      const response = await fetch('/api/assignments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employees: employees.map(e => e.code),
          mode: 'unassign',
          startDate: new Date().toISOString().split('T')[0]
        })
      })

      const result = await response.json()
      if (result.success) onSave(result.data)
      else showToast('error', `Failed: ${result.error}`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error unassigning')
    }
  }

  const items = shiftType === 'fixed' ? shifts : rotations

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>

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
                      {shiftType === 'rotation' ? `Rotation Pattern` : `${shift.start_time?.slice(0, 5)} - ${shift.end_time?.slice(0, 5)}`}
                    </div>
                    {employees[0]?.currentAssignment?.shiftId === shift.id && employees[0]?.currentAssignment?.startDate && (
                      <div className="mt-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                        Assigned since {new Date(employees[0].currentAssignment.startDate).toLocaleDateString()}
                      </div>
                    )}
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

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 rounded-b-2xl bg-gray-50/50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>

          {employees.length === 1 && employees[0].currentAssignment && (
            <button
              onClick={handleUnassign}
              className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove Shift
            </button>
          )}

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
