export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const department = searchParams.get('department')
    const employeeCodesParam = searchParams.get('employee_codes')

    if (!from || !to) {
      return NextResponse.json({ success: false, error: 'from and to are required' }, { status: 400 })
    }

    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const pageSize = Math.min(2000, Math.max(1, Number(searchParams.get('pageSize') || 1000)))
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('employee_daily_schedule')
      .select(`
        *,
        employee_master!inner (
          id,
          employee_code,
          employee_name,
          department
        )
      `, { count: 'exact' })
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date', { ascending: true })

    if (department) {
      query = query.eq('employee_master.department', department)
    }

    if (employeeCodesParam) {
      const codes = employeeCodesParam.split(',').map((c) => c.trim()).filter(Boolean)
      if (codes.length > 0) {
        query = query.in('employee_master.employee_code', codes)
      }
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1)
    if (error) throw error

    const schedule = data || []

    const shiftIds = Array.from(
      new Set(schedule.map((row: any) => row.shift_id).filter(Boolean)),
    )
    const shiftNames = Array.from(
      new Set(schedule.filter((row: any) => !row.shift_id && row.shift_name).map((row: any) => row.shift_name)),
    )

    const [templatesById, templatesByName] = await Promise.all([
      shiftIds.length > 0
        ? supabase.from('shift_templates').select('id,name,type').in('id', shiftIds)
        : Promise.resolve({ data: [] as any[] }),
      shiftNames.length > 0
        ? supabase.from('shift_templates').select('id,name,type').in('name', shiftNames)
        : Promise.resolve({ data: [] as any[] }),
    ])
    if ((templatesById as any).error) {
      console.warn('[ScheduleRangeAPI] shift_templates by id error:', (templatesById as any).error)
    }
    if ((templatesByName as any).error) {
      console.warn('[ScheduleRangeAPI] shift_templates by name error:', (templatesByName as any).error)
    }

    const idMap = new Map<string, { id: string; name: string; type: string | null }>()
    templatesById.data?.forEach((t: any) => idMap.set(t.id, t))

    const nameMap = new Map<string, { id: string; name: string; type: string | null }[]>()
    templatesByName.data?.forEach((t: any) => {
      const list = nameMap.get(t.name) || []
      list.push(t)
      nameMap.set(t.name, list)
    })

    const enriched = schedule.map((row: any) => {
      let shiftId = row.shift_id || null
      let shiftType: string | null = null

      if (shiftId && idMap.has(shiftId)) {
        const t = idMap.get(shiftId)!
        shiftType = t.type || 'fixed'
      } else if (!shiftId && row.shift_name) {
        const candidates = nameMap.get(row.shift_name) || []
        if (candidates.length === 1) {
          shiftId = candidates[0].id
          shiftType = candidates[0].type || 'fixed'
        }
      }

      if (!shiftType) {
        shiftType = 'fixed'
      }

      return { ...row, shift_id: shiftId, shift_type: shiftType }
    })

    return NextResponse.json({
      success: true,
      data: enriched,
      count: count || 0,
      page,
      pageSize
    })
  } catch (error: any) {
    console.error('[ScheduleRangeAPI] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
