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

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'template_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('shift_rotation_steps')
      .select('*')
      .eq('template_id', templateId)
      .order('step_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('[RotationStepsAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { template_id, steps } = body

    if (!template_id || !Array.isArray(steps)) {
      return NextResponse.json({ success: false, error: 'template_id and steps are required' }, { status: 400 })
    }

    await supabase.from('shift_rotation_steps').delete().eq('template_id', template_id)

    const payload = steps.map((step: any, idx: number) => ({
      template_id,
      step_order: idx,
      base_shift_id: step.base_shift_id || null,
      custom_name: step.custom_name || null,
      start_time: step.start_time || null,
      end_time: step.end_time || null,
      work_days: normalizeWorkDays(step.work_days)
    }))

    if (payload.length > 0) {
      const { error } = await supabase.from('shift_rotation_steps').insert(payload)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[RotationStepsAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
