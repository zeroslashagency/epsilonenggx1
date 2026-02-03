export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

// ✅ SECURITY FIX: Debug routes now require Super Admin
export async function GET(request: NextRequest) {
  // Require Super Admin for debug endpoints
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { data: templates, error } = await supabase
      .from('shift_templates')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({
      count: templates?.length || 0,
      templates
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

