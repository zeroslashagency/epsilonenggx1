export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

function normalizeWorkDays(input: any): number[] {
  if (!Array.isArray(input)) return [0, 1, 2, 3, 4, 5, 6]
  const days = input
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  return days.length > 0 ? Array.from(new Set(days)).sort() : [0, 1, 2, 3, 4, 5, 6]
}

function normalizeRotationSteps(steps: any[]) {
  return (steps || []).map((step, idx) => {
    const workDays = normalizeWorkDays(step.work_days)
    return {
      template_id: step.template_id,
      step_order: idx,
      base_shift_id: step.base_shift_id || null,
      custom_name: step.custom_name || null,
      start_time: step.start_time || null,
      end_time: step.end_time || null,
      work_days: workDays
    }
  })
}

async function writeAuditLog(supabase: any, actorId: string, action: string, meta: any) {
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    meta_json: meta
  })
}

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const includeSteps = searchParams.get('include_rotation_steps') === 'true'
    const includeCounts = searchParams.get('include_counts') === 'true'
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabase.from('shift_templates').select('*').order('created_at', { ascending: false })
    if (!includeArchived) query = query.eq('is_archived', false)

    const { data: templates, error } = await query
    if (error) throw error

    const templateList = templates || []
    const rotationTemplateIds = templateList.filter((t: any) => t.type === 'rotation').map((t: any) => t.id)

    let rotationSteps: any[] = []
    if (includeSteps && rotationTemplateIds.length > 0) {
      const { data } = await supabase
        .from('shift_rotation_steps')
        .select('*')
        .in('template_id', rotationTemplateIds)
        .order('step_order', { ascending: true })
      rotationSteps = data || []
    }

    let countsMap = new Map<string, number>()
    if (includeCounts) {
      const { data: assignments } = await supabase
        .from('employee_shift_assignments')
        .select('shift_template_id')
        .is('end_date', null)

      assignments?.forEach((row: any) => {
        if (row.shift_template_id) {
          countsMap.set(
            row.shift_template_id,
            (countsMap.get(row.shift_template_id) || 0) + 1
          )
        }
      })
    }

    const stepsByTemplate = new Map<string, any[]>()
    rotationSteps.forEach((step: any) => {
      if (!stepsByTemplate.has(step.template_id)) stepsByTemplate.set(step.template_id, [])
      stepsByTemplate.get(step.template_id)!.push(step)
    })

    const enriched = templateList.map((t: any) => ({
      ...t,
      active_count: includeCounts ? (countsMap.get(t.id) || 0) : undefined,
      rotation_steps: includeSteps ? (stepsByTemplate.get(t.id) || []) : undefined
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: any) {
    console.error('[ShiftTemplatesAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const {
      action,
      id,
      name,
      type,
      start_time,
      end_time,
      color,
      grace_minutes,
      overnight,
      work_days,
      notes,
      overtime_threshold,
      is_archived,
      rotation_steps,
      force
    } = body

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })
    }

    if (['create', 'update'].includes(action)) {
      if (!name || !type) {
        return NextResponse.json({ success: false, error: 'name and type are required' }, { status: 400 })
      }
      if (type === 'fixed' && (!start_time || !end_time)) {
        return NextResponse.json({ success: false, error: 'start_time and end_time are required for fixed shifts' }, { status: 400 })
      }
      if (type === 'rotation' && (!rotation_steps || rotation_steps.length === 0)) {
        return NextResponse.json({ success: false, error: 'rotation_steps are required for rotation shifts' }, { status: 400 })
      }
      if (type === 'rotation' && rotation_steps) {
        const invalidStep = rotation_steps.find((step: any) => {
          const hasBase = !!step.base_shift_id
          if (hasBase) return false
          return !step.custom_name || !step.start_time || !step.end_time
        })
        if (invalidStep) {
          return NextResponse.json({ success: false, error: 'Rotation steps require either a base shift or custom name/time' }, { status: 400 })
        }
      }

      const { data: existing } = await supabase
        .from('shift_templates')
        .select('id')
        .eq('name', name)
        .neq('id', id || '')
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Shift template name already exists' }, { status: 409 })
      }
    }

    if (action === 'create') {
      const payload = {
        name,
        type,
        start_time: type === 'fixed' ? start_time : null,
        end_time: type === 'fixed' ? end_time : null,
        color: color || '#3B82F6',
        grace_minutes: grace_minutes ?? 0,
        overnight: !!overnight,
        work_days: normalizeWorkDays(work_days),
        notes: notes || null,
        overtime_threshold: overtime_threshold ?? null,
        is_archived: !!is_archived
      }

      const { data, error } = await supabase
        .from('shift_templates')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      if (type === 'rotation' && rotation_steps?.length) {
        const stepsPayload = normalizeRotationSteps(
          rotation_steps.map((s: any) => ({ ...s, template_id: data.id }))
        )

        await supabase.from('shift_rotation_steps').delete().eq('template_id', data.id)
        const { error: stepError } = await supabase
          .from('shift_rotation_steps')
          .insert(stepsPayload)
        if (stepError) throw stepError
      }

      await writeAuditLog(supabase, user.id, 'shift_template_create', { template_id: data.id })

      return NextResponse.json({ success: true, data })
    }

    if (action === 'update') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'id is required for update' }, { status: 400 })
      }

      const payload: any = {
        name,
        type,
        color,
        grace_minutes,
        overnight,
        work_days: normalizeWorkDays(work_days),
        notes: notes || null,
        overtime_threshold: overtime_threshold ?? null,
        is_archived: !!is_archived
      }

      if (type === 'fixed') {
        payload.start_time = start_time
        payload.end_time = end_time
      } else {
        payload.start_time = null
        payload.end_time = null
      }

      const { error } = await supabase.from('shift_templates').update(payload).eq('id', id)
      if (error) throw error

      if (type === 'rotation' && rotation_steps) {
        const stepsPayload = normalizeRotationSteps(
          rotation_steps.map((s: any) => ({ ...s, template_id: id }))
        )

        await supabase.from('shift_rotation_steps').delete().eq('template_id', id)
        if (stepsPayload.length > 0) {
          const { error: stepError } = await supabase
            .from('shift_rotation_steps')
            .insert(stepsPayload)
          if (stepError) throw stepError
        }
      }

      await writeAuditLog(supabase, user.id, 'shift_template_update', { template_id: id })

      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'id is required for delete' }, { status: 400 })
      }

      const { data: activeAssignments } = await supabase
        .from('employee_shift_assignments')
        .select('id')
        .eq('shift_template_id', id)
        .is('end_date', null)

      if (activeAssignments && activeAssignments.length > 0 && !force) {
        return NextResponse.json(
          { success: false, error: 'Template has active assignments', active_count: activeAssignments.length },
          { status: 409 }
        )
      }

      const { error } = await supabase.from('shift_templates').delete().eq('id', id)
      if (error) throw error

      await writeAuditLog(supabase, user.id, 'shift_template_delete', { template_id: id })

      return NextResponse.json({ success: true })
    }

    if (action === 'archive') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'id is required for archive' }, { status: 400 })
      }

      const { error } = await supabase
        .from('shift_templates')
        .update({ is_archived: true })
        .eq('id', id)

      if (error) throw error

      await writeAuditLog(supabase, user.id, 'shift_template_archive', { template_id: id })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[ShiftTemplatesAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
