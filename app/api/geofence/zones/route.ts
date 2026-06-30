export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

// Geofence zones are admin-managed; gate on admin-level roles.
const ADMIN_ROLES = ['Super Admin', 'Admin', 'Manager'] as const

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('geofence_zones')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => ({}))
  const { name, center_lat, center_lng, radius_meters } = body
  if (!name?.trim() || typeof center_lat !== 'number' || typeof center_lng !== 'number' || typeof radius_meters !== 'number') {
    return NextResponse.json({ success: false, error: 'name, center_lat, center_lng, radius_meters are required' }, { status: 400 })
  }
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('geofence_zones')
    .insert({ name: name.trim(), center_lat, center_lng, radius_meters, created_by: (auth as any).id })
    .select()
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => ({}))
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
  const allowed: Record<string, unknown> = {}
  for (const k of ['name', 'center_lat', 'center_lng', 'radius_meters', 'is_active']) {
    if (k in fields) allowed[k] = fields[k]
  }
  allowed.updated_at = new Date().toISOString()
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from('geofence_zones').update(allowed).eq('id', id).select().single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('geofence_zones').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
