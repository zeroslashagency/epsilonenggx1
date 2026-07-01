export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'
import { hasMainDashboardPermission } from '@/app/lib/features/auth/dashboard-permissions'

export async function GET(request: NextRequest) {
  // ✅ Check: dashboard OR charts OR production permission
  const supabase = getSupabaseAdminClient()
  
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult
  
  // Super Admin bypass
  if (user.role === 'Super Admin' || user.role === 'super_admin') {
    // Continue to data fetching
  } else {
    // Check if user has dashboard OR charts OR production permission
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions_json')
      .eq('name', user.role)
      .single()
    
    const permissions = roleData?.permissions_json
    const hasDashboardPermission = hasMainDashboardPermission(permissions, 'view')
    const hasChartsPermission = permissions?.main_analytics?.items?.Chart?.view === true
    const hasProductionPermission = permissions?.production?.items?.Orders?.view === true
    
    if (!hasDashboardPermission && !hasChartsPermission && !hasProductionPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied. Required: dashboard.Dashboard.view OR charts.Chart.view OR production.Orders.view' },
        { status: 403 }
      )
    }
  }

  // Production metrics aggregation is not implemented yet. Return an honest
  // 501 instead of faking success with zeroed data.
  return NextResponse.json(
    {
      success: false,
      error: 'Not Implemented',
      message: 'Production metrics aggregation is not implemented yet.',
    },
    { status: 501 }
  )
}
