"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import {
  Plus, Search, MoreHorizontal, ChevronRight,
  Users, Shield, Briefcase, Clock, Trash2, Save
} from 'lucide-react'

// Types
interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  color: string
  grace_minutes: number
  overnight: boolean
  active_count?: number // New field
  type?: 'fixed' | 'rotation'
  pattern?: any // Changed from any[] to any to support object storage for fixed shifts
  work_days?: number[] // Helper property for UI state, not necessarily DB column
}

export default function ShiftManagerPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Selection / Editing State
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<Shift>>({})
  const [submitting, setSubmitting] = useState(false)

  // Rotation specific state
  const [isRotationMode, setIsRotationMode] = useState(false)
  const [rotationSteps, setRotationSteps] = useState<any[]>([])

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchShifts()
  }, [])

  useEffect(() => {
    const q = searchQuery.toLowerCase()
    setFilteredShifts(shifts.filter(s => s.name.toLowerCase().includes(q)))
  }, [searchQuery, shifts])

  async function fetchShifts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shift_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch Active Assignments (Roster Strength)
      // We check 'employee_shift_assignments' instead of daily schedule to show
      // how many people are *assigned* to this shift/rotation, regardless of whether they work today.
      const { data: activeAssignments } = await supabase
        .from('employee_shift_assignments')
        .select('shift_template_id, assignment_type')
        .is('end_date', null) // Only current/active assignments

      const countMap = new Map<string, number>()

      activeAssignments?.forEach((row: any) => {
        if (row.shift_template_id) {
          countMap.set(row.shift_template_id, (countMap.get(row.shift_template_id) || 0) + 1)
        }
      })

      // Ensure arrays are initialized if null
      const safeData = (data || []).map((d: any) => ({
        ...d,
        role_tags: d.role_tags || [],
        min_staffing: d.min_staffing || 0,
        pattern: d.pattern || (d.type === 'fixed' ? {} : []),
        // Use the assignment count
        active_count: countMap.get(d.id) || 0,
        // Hydrate work_days from pattern for Fixed Shifts
        work_days: (d.type === 'fixed' && d.pattern?.work_days)
          ? d.pattern.work_days
          : (d.work_days || [0, 1, 2, 3, 4, 5, 6]) // Fallback to safe default
      }))

      setShifts(safeData)
      setFilteredShifts(safeData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---

  function handleSelect(shift: Shift) {
    if (isCreating) {
      if (!confirm("Discard new shift?")) return;
    }
    setIsCreating(false)
    setSelectedShift(shift)
    setFormData(shift)

    // Load rotation data if applicable
    if (shift.type === 'rotation') {
      setIsRotationMode(true)
      setRotationSteps(shift.pattern || [])
    } else {
      setIsRotationMode(false)
      setRotationSteps([])
    }
  }

  function handleCreateNew(mode: 'fixed' | 'rotation' = 'fixed') {
    setIsCreating(true)
    setSelectedShift(null)
    setIsRotationMode(mode === 'rotation')
    setRotationSteps([{
      shift_name: 'Week 1', start_time: '09:00', end_time: '17:00',
      work_days: [1, 2, 3, 4, 5] // Default Mon-Fri
    }])

    setFormData({
      name: '',
      start_time: '09:00',
      end_time: '17:00',
      color: '#3B82F6',
      grace_minutes: 10,
      overnight: false,
      type: mode,
      work_days: [1, 2, 3, 4, 5] // Default Mon-Fri for Fixed
    })
  }

  function addRotationStep() {
    setRotationSteps([...rotationSteps, {
      shift_name: `Week ${rotationSteps.length + 1}`,
      start_time: '09:00',
      end_time: '17:00',
      work_days: [1, 2, 3, 4, 5]
    }])
  }

  function updateRotationStep(index: number, field: string, value: any) {
    const newSteps = [...rotationSteps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setRotationSteps(newSteps)
  }

  function removeRotationStep(index: number) {
    if (rotationSteps.length > 1) {
      setRotationSteps(rotationSteps.filter((_, i) => i !== index))
    }
  }

  async function handleSave() {
    if (!formData.name) return alert("Please enter a name")

    if (isRotationMode && rotationSteps.length === 0) return alert("Rotation must have at least one step")

    setSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        // For rotations, main times ignore specific steps but we can keep defaults
        start_time: isRotationMode ? '00:00' : formData.start_time,
        end_time: isRotationMode ? '00:00' : formData.end_time,
        color: formData.color,
        grace_minutes: formData.grace_minutes,
        overnight: formData.overnight,
        type: isRotationMode ? 'rotation' : 'fixed',
        // STORE WORK_DAYS IN PATTERN (Zero-Migration Fix)
        pattern: isRotationMode
          ? rotationSteps
          : { work_days: formData.work_days || [0, 1, 2, 3, 4, 5, 6] },
        // Add direct work_days for the new schema
        work_days: isRotationMode ? [0, 1, 2, 3, 4, 5, 6] : (formData.work_days || [0, 1, 2, 3, 4, 5, 6])
      }

      if (isCreating) {
        const { error } = await supabase.from('shift_templates').insert(payload)
        if (error) throw error
      } else if (selectedShift) {
        const { error } = await supabase
          .from('shift_templates')
          .update(payload)
          .eq('id', selectedShift.id)
        if (error) throw error
      }
      await fetchShifts()
      setIsCreating(false)
      setSelectedShift(null)
    } catch (e) {
      alert("Save failed")
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedShift || !confirm("Delete this?")) return
    setSubmitting(true)
    try {
      await supabase.from('shift_templates').delete().eq('id', selectedShift.id)
      await fetchShifts()
      setSelectedShift(null)
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }


  return (
    <PermissionGuard module="tools_shift" item="Shift Manager">
      <ZohoLayout breadcrumbs={[{ label: 'Tools' }, { label: 'Shift Manager' }]}>
        <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
          {/* Main List Area */}
          <div className={`flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-all duration-300 ${selectedShift || isCreating ? 'w-2/3' : 'w-full'}`}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Manager</h1>
                <p className="text-gray-500 text-sm">Manage shift templates and rotations</p>
              </div>
              <button
                onClick={() => handleCreateNew('fixed')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shifts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
                filteredShifts.map(shift => (
                  <div
                    key={shift.id}
                    onClick={() => handleSelect(shift)}
                    className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${selectedShift?.id === shift.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-1 h-12 rounded-full ${shift.type === 'rotation' ? 'bg-purple-500' : ''}`} style={{ backgroundColor: shift.type === 'rotation' ? undefined : shift.color }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{shift.name}</h3>
                          {shift.type === 'rotation' && <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">Rotation</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-mono mt-0.5">
                          <Clock className="w-3 h-3" />
                          {shift.type === 'rotation' ? `${shift.pattern?.length || 0} Steps` : `${shift.start_time?.slice(0, 5)} - ${shift.end_time?.slice(0, 5)}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-sm min-w-[120px]">
                      <div title="Currently Active" className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span>{shift.active_count} Active</span>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform ${selectedShift?.id === shift.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Quick Edit Panel (Right Side) */}
          {(selectedShift || isCreating) && (
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right-10 duration-300">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-bold">
                  {isCreating ? "Create New" : "Edit Shift"}
                </h2>
                <button onClick={() => { setIsCreating(false); setSelectedShift(null) }} className="text-gray-400 hover:text-gray-600">Close</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Shift Type Toggle - INSIDE BUTTON concept */}
                <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-lg flex text-sm font-medium">
                  <button
                    className={`flex-1 py-1.5 rounded-md transition-all ${!isRotationMode ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => {
                      setIsRotationMode(false);
                      setFormData({ ...formData, type: 'fixed' });
                    }}
                  >
                    Fixed Shift
                  </button>
                  <button
                    className={`flex-1 py-1.5 rounded-md transition-all ${isRotationMode ? 'bg-white dark:bg-gray-700 shadow text-purple-600 dark:text-purple-300' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => {
                      setIsRotationMode(true);
                      setFormData({ ...formData, type: 'rotation' });
                      if (rotationSteps.length === 0) setRotationSteps([{ shift_name: 'Day 1', start_time: '09:00', end_time: '17:00' }]);
                    }}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Rotation {isRotationMode && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}
                    </span>
                  </button>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={isRotationMode ? "e.g. 3-Shift Rotation" : "e.g. Morning Shift"}
                    />
                  </div>

                  {!isRotationMode && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">Start Time</label>
                        <input
                          type="time"
                          value={formData.start_time || ''}
                          onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">End Time</label>
                        <input
                          type="time"
                          value={formData.end_time || ''}
                          onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ROTATION BUILDER */}
                {isRotationMode && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Rotation Steps</h3>
                        <p className="text-xs text-gray-500">Each step applies for 1 week (7 days)</p>
                      </div>
                      <button type="button" onClick={addRotationStep} className="text-xs text-blue-500 font-medium hover:underline">+ Add Week</button>
                    </div>
                    <div className="space-y-3">
                      {rotationSteps.map((step, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Week {idx + 1}</span>
                            <button onClick={() => removeRotationStep(idx)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                          <select
                            value={step.shift_name || ''}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              const baseShift = shifts.find(s => s.name === selectedName);
                              if (baseShift) {
                                const newSteps = [...rotationSteps];
                                newSteps[idx] = {
                                  ...newSteps[idx],
                                  shift_name: baseShift.name,
                                  start_time: baseShift.start_time.slice(0, 5),
                                  end_time: baseShift.end_time.slice(0, 5)
                                };
                                setRotationSteps(newSteps);
                              } else {
                                updateRotationStep(idx, 'shift_name', selectedName);
                              }
                            }}
                            className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                          >
                            <option value="">Select Base Shift...</option>
                            {shifts.filter(s => s.type !== 'rotation' || s.id !== selectedShift?.id).map(s => (
                              <option key={s.id} value={s.name}>{s.name} ({s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})</option>
                            ))}
                            <option value="CUSTOM">-- Custom Entry --</option>
                          </select>
                          {step.shift_name === 'CUSTOM' && (
                            <input
                              type="text"
                              placeholder="Custom Shift Name"
                              value={step.custom_name || ''}
                              onChange={(e) => updateRotationStep(idx, 'custom_name', e.target.value)}
                              className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 mt-2"
                            />
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <input type="time" value={step.start_time} onChange={e => updateRotationStep(idx, 'start_time', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-xs" />
                            <input type="time" value={step.end_time} onChange={e => updateRotationStep(idx, 'end_time', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-xs" />
                          </div>

                          {/* Working Days for this Step */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Working Days</label>
                            <div className="flex gap-1">
                              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                                const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                                const currentDays = step.work_days || [0, 1, 2, 3, 4, 5, 6]
                                const isSelected = currentDays.includes(day)
                                return (
                                  <button
                                    key={day}
                                    onClick={() => {
                                      const next = isSelected
                                        ? currentDays.filter((d: any) => d !== day)
                                        : [...currentDays, day]
                                      updateRotationStep(idx, 'work_days', next)
                                    }}
                                    className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'}`}
                                  >
                                    {labels[day]}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Work Days (Fixed Shifts Only) */}
                {!isRotationMode && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Working Days</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => {
                        const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                        const currentDays = formData.work_days || [0, 1, 2, 3, 4, 5, 6]
                        const isSelected = currentDays.includes(day)
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              const next = isSelected
                                ? currentDays.filter(d => d !== day)
                                : [...currentDays, day]
                              setFormData({ ...formData, work_days: next })
                            }}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200'}`}
                          >
                            {labels[day]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}


                {/* Meta */}
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Shift Color</label>
                    <input type="color" value={formData.color || '#3B82F6'} onChange={e => setFormData({ ...formData, color: e.target.value })} className="h-8 w-16 rounded cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.overnight || false} onChange={e => setFormData({ ...formData, overnight: e.target.checked })} className="rounded text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overnight Shift</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                {!isCreating && (
                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 font-bold text-sm shadow-lg transition-all"
                >
                  {submitting ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </ZohoLayout >
    </PermissionGuard>
  )
}
