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
