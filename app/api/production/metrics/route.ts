export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'today'
    
    const supabase = getSupabaseAdminClient()

    // Return mock data for now - implement actual metrics logic later
    const metrics = {
      totalProduction: 0,
      efficiency: 0,
      quality: 0,
      downtime: 0,
      period
    }

    return NextResponse.json({ success: true, data: metrics })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
