import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    
    const body = await request.json()
    const {
      user_email,
      global_start_datetime,
      global_setup_window,
      shift_1,
      shift_2,
      production_shift_1,
      production_shift_2,
      production_shift_3,
      holidays,
      breakdowns,
      is_locked,
      locked_at,
      role
    } = body

    const userEmail = request.headers.get('X-User-Email') || user_email || 'default@user.com'
    
    if (is_locked) {
      // LOCKING: Save locked settings to Supabase
      
      // First, deactivate any existing locked settings for this user
      await supabase
        .from('dashboard_data')
        .update({ is_active: false })
        .eq('session_name', `Advanced Settings - ${userEmail}`)

      // Insert new locked settings
      const settingsData = {
        global_start_datetime: global_start_datetime || null,
        global_setup_window: global_setup_window || null,
        shift_1: shift_1 || null,
        shift_2: shift_2 || null,
        production_shift_1: production_shift_1 || null,
        production_shift_2: production_shift_2 || null,
        production_shift_3: production_shift_3 || null,
        holidays: holidays || [],
        breakdowns: breakdowns || [],
        is_locked: true, // Always true when locking
        locked_at: locked_at || new Date().toISOString(),
        role: role || 'operator',
        user_email: userEmail
      }

      const { data, error } = await supabase
        .from('dashboard_data')
        .insert({
          user_id: null,
          dashboard_session_id: `advanced_settings_${userEmail}_${Date.now()}`,
          session_name: `Advanced Settings - ${userEmail}`,
          timeline_view: 'advanced_settings',
          chart_data: {},
          machine_data: settingsData,
          is_active: true
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to save advanced settings', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Advanced settings locked successfully',
        data: data[0]
      })

    } else {
      // UNLOCKING: Just deactivate the locked settings
      const { error } = await supabase
        .from('dashboard_data')
        .update({ is_active: false })
        .eq('session_name', `Advanced Settings - ${userEmail}`)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to unlock advanced settings', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Advanced settings unlocked successfully',
        data: null
      })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    
    const userEmail = request.headers.get('X-User-Email') || 'default@user.com'
    
    // Get the most recent active settings for this user from dashboard_data
    const { data, error } = await supabase
      .from('dashboard_data')
      .select('*')
      .eq('session_name', `Advanced Settings - ${userEmail}`)
      .eq('timeline_view', 'advanced_settings')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to load advanced settings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0] || null
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
