export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'

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
    const hasDashboardPermission = permissions?.main_dashboard?.items?.Dashboard?.view === true
    const hasAnalyticsPermission = permissions?.main_analytics?.items?.Analytics?.view === true
    
    if (!hasDashboardPermission && !hasAnalyticsPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied. Required: dashboard.Dashboard.view OR analytics.Analytics.view' },
        { status: 403 }
      )
    }
  }

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
