export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    

    // Get the most recent logs
    const { data: recentLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    // Check for deletion logs specifically
    const deletionLogs = recentLogs?.filter(log => 
      log.action === 'user_deletion' || log.action === 'user_deletion_completed'
    ) || []

    return NextResponse.json({
      success: true,
      totalRecentLogs: recentLogs?.length || 0,
      deletionLogs: deletionLogs.length,
      recentLogs: recentLogs?.slice(0, 5) || [],
      allDeletionLogs: deletionLogs
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
