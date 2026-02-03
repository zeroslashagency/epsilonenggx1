export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/schedule/roster
 * Get effective schedule for all employees for a specific date
 * Query params: date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'date is required' },
        { status: 400 }
      )
    }

    // ✅ SECURITY FIX: Use singleton admin client instead of inline createClient
    const supabase = getSupabaseAdminClient()

    // 1. Fetch all employees
    const { data: employees, error: empError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department')
      .order('employee_name')

    if (empError) throw empError

    // 1.5 Fetch all shift templates for reliable name-to-id resolution
    const { data: allTemplates } = await supabase
      .from('shift_templates')
      .select('*')

    // 2. Fetch all daily overrides for this date
    const { data: overrides, error: overrideError } = await supabase
      .from('employee_daily_schedule')
      .select('*')
      .eq('work_date', dateStr)

    if (overrideError) throw overrideError

    // 3. Fetch all active assignments for this date
    const { data: assignments, error: assignError } = await supabase
      .from('employee_shift_assignments')
      .select(`
        *,
        shift_template:shift_templates(*)
      `)
      .lte('start_date', dateStr)
      .or(`end_date.is.null,end_date.gte.${dateStr}`)

    if (assignError) throw assignError

    // 4. Fetch holidays
    const { data: settingsData } = await supabase
      .from('dashboard_data')
      .select('machine_data')
      .eq('timeline_view', 'advanced_settings')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    const holidays = settingsData?.[0]?.machine_data?.holidays || []
    const isPublicHoliday = holidays.some((h: any) => {
      const hStart = new Date(h.startDateTime).toISOString().split('T')[0]
      const hEnd = new Date(h.endDateTime).toISOString().split('T')[0]
      return dateStr >= hStart && dateStr <= hEnd
    })

    // 5. Pre-fetch rotation steps
    const rotationIds = Array.from(new Set(
      assignments
        ?.filter((a: any) => a.assignment_type === 'rotation')
        .map((a: any) => a.shift_template_id) || []
    ))

    let rotationSteps: any[] = []
    if (rotationIds.length > 0) {
      const { data } = await supabase
        .from('shift_rotation_steps')
        .select('*')
        .in('template_id', rotationIds)
        .order('step_order', { ascending: true })
      if (data) rotationSteps = data
    }

    // Resolve effective shift for each employee
    const roster = employees.map(emp => {
      const code = emp.employee_code

      // Check Assignment first (to have it available for override resolution)
      const activeAssignments = (assignments || [])
        .filter(a => a.employee_code === code)
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      
      const assignment = activeAssignments[0]

      // Check override first (highest priority for daily view)
      const override = overrides?.find(o => o.employee_code === code)
      if (override) {
        // Resolve Template ID if missing (critical for column matching in UI)
        let resolvedShiftId = override.shift_id
        if (!resolvedShiftId && allTemplates) {
            // Priority 1: Use name-based lookup (precise if name matches exactly)
            const matchedTemplate = override.shift_name ? allTemplates.find(t => t.name === override.shift_name) : null
            resolvedShiftId = matchedTemplate?.id

            // Priority 2: Use base assignment template ID (best for rotation sub-shifts like "Day 1")
            if (!resolvedShiftId && assignment) {
                resolvedShiftId = assignment.shift_template_id
            }
        }

        return {
          ...emp,
          shift: {
            id: resolvedShiftId,
            name: override.shift_name,
            start_time: override.shift_start,
            end_time: override.shift_end,
            color: override.color,
            overnight: override.overnight,
            source: 'override'
          }
        }
      }

      // Check Public Holiday
      if (isPublicHoliday) {
        return {
          ...emp,
          shift: {
            name: 'Public Holiday',
            is_off: true,
            color: '#EF4444',
            source: 'holiday'
          }
        }
      }

      if (assignment) {
        const t = assignment.shift_template
        if (assignment.assignment_type === 'fixed' && t) {
          const workDays = t.work_days || t.pattern?.work_days || [0, 1, 2, 3, 4, 5, 6]
          const dayOfWeek = new Date(dateStr).getDay()

          if (!workDays.includes(dayOfWeek)) {
            return { ...emp, shift: { name: 'Weekly Off', is_off: true, color: '#9CA3AF', source: 'assignment' } }
          }

          return {
            ...emp,
            shift: {
              id: t.id,
              name: t.name,
              start_time: t.start_time,
              end_time: t.end_time,
              color: t.color,
              overnight: t.overnight,
              source: 'assignment'
            }
          }
        } else if (assignment.assignment_type === 'rotation' && t) {
          const steps = rotationSteps.filter(s => s.template_id === assignment.shift_template_id)
          const pattern = steps.length > 0 ? steps : (Array.isArray(t.pattern) ? t.pattern : [])
          const weeks = t.weeks_pattern || pattern.length || 1
          
          const aStartStr = assignment.start_date
          const currStr = dateStr
          
          // Timezone-safe date diff (using UTC to ensure 24h day cycles)
          const startUTC = new Date(aStartStr + 'T00:00:00Z')
          const currUTC = new Date(currStr + 'T00:00:00Z')
          const daysDiff = Math.floor((currUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24))
          
          const weekIdx = Math.floor(daysDiff / 7) % weeks
          const weekPattern = pattern[weekIdx]

          if (weekPattern) {
            // Default to [0..6] if work_days missing in pattern
            const workDays = weekPattern.work_days || t.work_days || t.pattern?.work_days || [0, 1, 2, 3, 4, 5, 6]
            const dayOfWeek = currUTC.getUTCDay()

            if (!workDays.includes(dayOfWeek)) {
              return { ...emp, shift: { name: 'Weekly Off', is_off: true, color: '#9CA3AF', source: 'assignment' } }
            }

            return {
              ...emp,
              shift: {
                id: t.id,
                name: weekPattern.shift_name,
                start_time: weekPattern.start_time,
                end_time: weekPattern.end_time,
                color: t.color || '#8B5CF6',
                overnight: weekPattern.overnight,
                source: 'assignment'
              }
            }
          }
        }
      }

      // Default: Unassigned
      return { ...emp, shift: null }
    })

    return NextResponse.json({
      success: true,
      data: roster
    })

  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
