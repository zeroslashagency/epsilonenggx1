export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function GET(request: NextRequest) {
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
    console.error('Error fetching production metrics:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
