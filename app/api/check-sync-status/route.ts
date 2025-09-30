import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use direct Supabase configuration
const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'Request ID is required'
      }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get sync request status
    const { data: syncRequest, error } = await supabase
      .from('sync_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    
    if (error) {
      console.error('Error fetching sync request:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sync request status'
      }, { status: 500 })
    }
    
    if (!syncRequest) {
      return NextResponse.json({
        success: false,
        error: 'Sync request not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      requestId: syncRequest.id,
      status: syncRequest.status,
      syncType: syncRequest.sync_type,
      requestedAt: syncRequest.requested_at,
      startedAt: syncRequest.started_at,
      completedAt: syncRequest.completed_at,
      result: syncRequest.result,
      errorMessage: syncRequest.error_message,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Check sync status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}




