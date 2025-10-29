export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require dashboard.create permission
  const authResult = await requirePermission(request, 'dashboard.create')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get the request body
    const body = await request.json()
    const {
      dashboard_session_id,
      session_name,
      timeline_view,
      chart_data,
      machine_data
    } = body

    // Get the current user from the session
    const userEmail = request.headers.get('X-User-Email') || 'default@user.com'
    
    // Deactivate all previous dashboard sessions (simplified for testing)
    await supabase
      .from('dashboard_data')
      .update({ is_active: false })

    // Insert new dashboard data
    const { data, error } = await supabase
      .from('dashboard_data')
      .insert({
        user_id: null, // Set to null like existing data
        dashboard_session_id,
        session_name,
        timeline_view,
        chart_data,
        machine_data,
        sync_timestamp: new Date().toISOString(),
        is_active: true
      })
      .select()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to sync dashboard data',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: 'Dashboard data synced successfully' 
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require dashboard.view permission
  const authResult = await requirePermission(request, 'dashboard.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get the latest dashboard data
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('dashboard_data')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (dashboardError) {
      return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }

    if (!dashboardData || dashboardData.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: null, 
        message: 'No dashboard data found' 
      })
    }

    const latestData = dashboardData[0]
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: latestData.dashboard_session_id,
        sessionName: latestData.session_name,
        timelineView: latestData.timeline_view,
        chartData: latestData.chart_data,
        machineData: latestData.machine_data,
        syncTimestamp: latestData.sync_timestamp,
        scrollPosition: latestData.scroll_position,
        isActive: latestData.is_active,
        createdAt: latestData.created_at,
        updatedAt: latestData.updated_at
      },
      message: 'Dashboard data fetched successfully'
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
