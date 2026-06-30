export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

const ADMIN_ROLES = ['Super Admin', 'Admin', 'Manager'] as const

// Read-only recent punch monitor (the mobile app writes these via record_geo_punch RPC).
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [...ADMIN_ROLES])
  if (auth instanceof NextResponse) return auth
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}
