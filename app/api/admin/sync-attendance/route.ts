import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { syncType, dateFrom, dateTo, requestedBy } = await request.json()

    // Validate sync type
    const validSyncTypes = ['manual', 'historical', 'auto']
    if (!validSyncTypes.includes(syncType)) {
      return NextResponse.json({
        error: 'Invalid sync type. Must be: manual, historical, or auto'
      }, { status: 400 })
    }

    // Create sync request
    const { data: syncRequest, error: requestError } = await supabase
      .from('sync_requests')
      .insert({
        sync_type: syncType,
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
      message: `${syncType} sync request created successfully`,
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
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
        return NextResponse.json({
          error: 'Sync request not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        syncRequest
      })
    } else {
      // Get recent sync requests
      const { data: syncRequests, error } = await supabase
        .from('sync_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // Get device status
      const { data: deviceStatus, error: deviceError } = await supabase
        .from('device_status')
        .select('*')
        .single()

      return NextResponse.json({
        success: true,
        syncRequests: syncRequests || [],
        deviceStatus: deviceStatus || null
      })
    }

  } catch (error: any) {
    console.error('Get sync status error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
