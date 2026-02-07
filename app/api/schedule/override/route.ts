export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const {
      employee_code,
      work_date,
      action,
      shift_id,
      shift_name,
      shift_start,
      shift_end,
      color,
      overnight,
      grace_minutes
    } = body

    if (!employee_code || !work_date || !action) {
      return NextResponse.json({ success: false, error: 'employee_code, work_date, and action are required' }, { status: 400 })
    }

    if (action === 'clear') {
      const { error } = await supabase
        .from('employee_daily_schedule')
        .delete()
        .eq('employee_code', employee_code)
        .eq('work_date', work_date)

      if (error) throw error

      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'shift_override_clear',
        meta_json: { employee_code, work_date }
      })

      return NextResponse.json({ success: true })
    }

    if (action !== 'assign') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    let finalShiftName = shift_name
    let finalShiftStart = shift_start
    let finalShiftEnd = shift_end
    let finalColor = color
    let finalOvernight = overnight
    let finalGrace = grace_minutes

    if (shift_id && (!finalShiftName || !finalShiftStart || !finalShiftEnd)) {
      const { data: template, error: templateError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', shift_id)
        .single()

      if (templateError) throw templateError

      finalShiftName = finalShiftName || template.name
      finalShiftStart = finalShiftStart || template.start_time
      finalShiftEnd = finalShiftEnd || template.end_time
      finalColor = finalColor || template.color
      finalOvernight = finalOvernight ?? template.overnight
      finalGrace = finalGrace ?? template.grace_minutes
    }

    if (!finalShiftName || !finalShiftStart || !finalShiftEnd) {
      return NextResponse.json({ success: false, error: 'shift_name, shift_start, and shift_end are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('employee_daily_schedule')
      .upsert({
        employee_code,
        work_date,
        shift_id: shift_id || null,
        shift_name: finalShiftName,
        shift_start: finalShiftStart,
        shift_end: finalShiftEnd,
        color: finalColor || '#3B82F6',
        overnight: finalOvernight || false,
        grace_minutes: finalGrace || 0
      }, { onConflict: 'employee_code,work_date' })

    if (error) throw error

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'shift_override_set',
      meta_json: { employee_code, work_date, shift_id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[ScheduleOverrideAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
