export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    const { action, syncType, dateFrom, dateTo, requestedBy } = await request.json()

    // Handle trigger-sync action
    if (action === 'trigger-sync') {
      // Calculate date range for historical sync
      let fromDate = null
      let toDate = null
      
      if (syncType === 'historical') {
        // Default to 1 month if not specified
        toDate = new Date().toISOString().split('T')[0]
        fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        if (dateTo) {
          toDate = dateTo
        }
      }
      
      const { data: syncRequest, error: insertError } = await supabase
        .from('sync_requests')
        .insert({
          sync_type: syncType || 'manual',
          status: 'pending',
          requested_by: requestedBy || 'dashboard',
          requested_at: new Date().toISOString(),
          result: fromDate && toDate ? `Historical sync: ${fromDate} to ${toDate}` : null
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      
      // Get device status
      const { data: deviceStatus } = await supabase
        .from('device_status')
        .select('*')
        .single()
      
      const message = syncType === 'historical' 
        ? `Historical sync requested for ${fromDate} to ${toDate}`
        : 'Sync request created successfully'
      
      return NextResponse.json({
        success: true,
        message,
        data: {
          syncRequest,
          deviceStatus,
          dateRange: fromDate && toDate ? { fromDate, toDate } : null,
          note: 'The Windows sync script will process this request within 10 seconds'
        }
      })
    }

    // Legacy support: Create sync request
    const validSyncTypes = ['manual', 'historical', 'auto']
    if (syncType && !validSyncTypes.includes(syncType)) {
      return NextResponse.json({
        error: 'Invalid sync type. Must be: manual, historical, or auto'
      }, { status: 400 })
    }

    const { data: syncRequest, error: requestError } = await supabase
      .from('sync_requests')
      .insert({
        sync_type: syncType || 'manual',
        requested_by: requestedBy || 'ui-user',
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating sync request:', requestError)
      return NextResponse.json({
        error: 'Failed to create sync request'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${syncType || 'manual'} sync request created successfully`,
      syncRequest: {
        id: syncRequest.id,
        type: syncRequest.sync_type,
        status: syncRequest.status,
        requestedAt: syncRequest.requested_at,
        createdAt: syncRequest.created_at
      }
    })

  } catch (error: any) {
    console.error('Sync attendance error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (requestId) {
      // Get specific sync request status
      const { data: syncRequest, error } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        syncRequest
      })
    }

    // Get all recent sync requests
    const { data: syncRequests, error: listError } = await supabase
      .from('sync_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(20)

    if (listError) throw listError

    // Get device status
    const { data: deviceStatus } = await supabase
      .from('device_status')
      .select('*')
      .single()

    return NextResponse.json({
      success: true,
      data: {
        syncRequests: syncRequests || [],
        deviceStatus: deviceStatus || null
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
