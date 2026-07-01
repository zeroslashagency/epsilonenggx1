export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

const ADMIN_ROLES = ['Super Admin', 'Admin', 'Manager'] as const

// Postgres error codes that mean "table/relation not provisioned yet" — treat as
// empty, not a 500, so the Punch Monitor tab degrades gracefully in envs where
// the geofence schema (record_geo_punch RPC + attendance_punches) isn't applied.
const MISSING_RELATION = new Set(['42P01', '42501', 'PGRST205'])

// Read-only recent punch monitor (the mobile app writes these via record_geo_punch RPC).
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const supabase = getSupabaseForRequest(request)
  const { data, error } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    if (MISSING_RELATION.has(error.code)) {
      return NextResponse.json({ success: true, data: [] })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}
