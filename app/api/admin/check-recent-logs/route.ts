import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('🔍 Checking recent audit logs...')

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
