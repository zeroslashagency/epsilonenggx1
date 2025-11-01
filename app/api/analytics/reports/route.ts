export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ SECURITY FIX: Require authentication and permission
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const type = searchParams.get('type') || 'production'
    
    const supabase = getSupabaseAdminClient()

    // Return mock data for now - implement actual analytics logic later
    const reports = {
      period,
      type,
      data: []
    }

    return NextResponse.json({ success: true, data: reports })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
