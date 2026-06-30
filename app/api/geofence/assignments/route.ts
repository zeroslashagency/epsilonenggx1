export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

const ADMIN_ROLES = ['Super Admin', 'Admin', 'Manager'] as const

// GET: assignments joined with profile + zone, plus the list of assignable users.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const supabase = getSupabaseAdminClient()

  const [{ data: assignments, error: aErr }, { data: profiles, error: pErr }] = await Promise.all([
    supabase.from('user_geofence_assignments').select('*').order('assigned_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email, employee_code, role').order('full_name'),
  ])
  if (aErr) return NextResponse.json({ success: false, error: aErr.message }, { status: 500 })
  if (pErr) return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
  return NextResponse.json({ success: true, data: { assignments: assignments ?? [], profiles: profiles ?? [] } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => ({}))
  const { user_id, zone_id } = body
  if (!user_id || !zone_id) {
    return NextResponse.json({ success: false, error: 'user_id and zone_id are required' }, { status: 400 })
  }
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_geofence_assignments')
    .insert({ user_id, zone_id, assigned_by: (auth as any).id })
    .select()
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('user_geofence_assignments').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
