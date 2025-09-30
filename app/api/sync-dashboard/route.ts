import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use direct Supabase configuration instead of environment variables
const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
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
    console.error('Sync dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the latest dashboard data
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('dashboard_data')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (dashboardError) {
      console.error('Dashboard data error:', dashboardError)
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
    console.error('Load dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
