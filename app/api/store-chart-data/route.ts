export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const body = await request.json()
    const {
      sessionId,
      timestamp,
      timelineView,
      chartData,
      machineData,
      schedulingResults
    } = body

    if (!chartData || !chartData.tasks || !Array.isArray(chartData.tasks)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chart data payload' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const userEmail = request.headers.get('X-User-Email') || user.email || 'default@user.com'
    const sessionName = `Scheduler Chart - ${userEmail}`

    await supabase
      .from('dashboard_data')
      .update({ is_active: false })
      .eq('session_name', sessionName)

    const insertPayload = {
      user_id: user.id || null,
      dashboard_session_id: sessionId || `chart_${Date.now()}`,
      session_name: sessionName,
      timeline_view: timelineView || 'day',
      chart_data: {
        ...chartData,
        schedulingResults: Array.isArray(schedulingResults) ? schedulingResults : []
      },
      machine_data: machineData || {},
      sync_timestamp: timestamp || new Date().toISOString(),
      is_active: true
    }

    const { data, error } = await supabase
      .from('dashboard_data')
      .insert(insertPayload)
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to store chart data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Chart data stored successfully',
      data: data?.[0] || null
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
