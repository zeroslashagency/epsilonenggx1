import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const requestId = request.nextUrl.searchParams.get('requestId')
    
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'Request ID is required'
      }, { status: 400 })
    }
    
    const supabase = getSupabaseAdminClient()
    
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




