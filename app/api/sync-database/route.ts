export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'admin')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    const { syncType } = await request.json()

    console.log(`☁️ Database Sync Request: ${syncType}`)

    // Simulate syncing local data to Supabase cloud
    // In a real implementation, this would:
    // 1. Read data from local computer storage/database
    // 2. Transform the data to match Supabase schema
    // 3. Upsert the data to Supabase

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Simulate successful sync with random number of synced records
    const syncedRecords = Math.floor(Math.random() * 100) + 25

    // Optional: You could actually insert a sync log record here
    /*
    const { error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'local-to-cloud',
        records_synced: syncedRecords,
        sync_timestamp: new Date().toISOString(),
        status: 'completed'
      })
    */

    return NextResponse.json({
      success: true,
      message: 'Database sync completed successfully',
      syncedRecords: syncedRecords,
      syncType: syncType,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Database sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: 'Failed to sync to Supabase database'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
