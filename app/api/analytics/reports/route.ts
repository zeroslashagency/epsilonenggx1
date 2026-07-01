export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'
import { hasMainDashboardPermission } from '@/app/lib/features/auth/dashboard-permissions'

export async function GET(request: NextRequest) {
  // ✅ Check: dashboard OR analytics permission
  const supabase = getSupabaseAdminClient()
  
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult
  
  // Super Admin bypass
  if (user.role === 'Super Admin' || user.role === 'super_admin') {
    // Continue to data fetching
  } else {
    // Check if user has dashboard OR analytics permission
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions_json')
      .eq('name', user.role)
      .single()
    
    const permissions = roleData?.permissions_json
    const hasDashboardPermission = hasMainDashboardPermission(permissions, 'view')
    const hasAnalyticsPermission = permissions?.main_analytics?.items?.Analytics?.view === true
    
    if (!hasDashboardPermission && !hasAnalyticsPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied. Required: dashboard.Dashboard.view OR analytics.Analytics.view' },
        { status: 403 }
      )
    }
  }

  // Analytics report generation is not implemented yet. Return an honest
  // 501 instead of faking success with an empty payload.
  return NextResponse.json(
    {
      success: false,
      error: 'Not Implemented',
      message: 'Analytics report generation is not implemented yet.',
    },
    { status: 501 }
  )
}
