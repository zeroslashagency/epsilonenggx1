/**
 * Supabase Edge Function: Trigger SmartOffice Sync
 * 
 * IMPORTANT: This is Deno code for Supabase Edge Functions, NOT Node.js!
 * 
 * This file is meant to be deployed to Supabase using:
 *   supabase functions deploy trigger-sync
 * 
 * The @ts-ignore comments suppress IDE errors because this uses Deno runtime,
 * not Node.js. These errors are expected and safe to ignore.
 * 
 * This function creates a sync request that the Windows sync script will pick up.
 */

// @ts-ignore - Deno imports (expected in Supabase Edge Functions)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno imports (expected in Supabase Edge Functions)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 🔐 SECURITY: Restrict CORS to your domain only
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}

// @ts-ignore - Deno serve function
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    // @ts-ignore - Deno.env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore - Deno.env
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const { 
      syncType = 'manual', 
      requestedBy = 'dashboard',
      dateFrom = null,
      dateTo = null,
      autoDetectRange = false,
      action = null  // New: support for immediate refresh
    } = await req.json()

    // Prepare sync request data
    let syncRequestData: any = {
      sync_type: syncType,
      status: 'pending',
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
    }

    // Determine sync type and message based on input
    if (dateFrom && dateTo) {
      // Historical sync from IDE with date range
      syncRequestData.sync_type = 'historical'
      syncRequestData.result = `Historical sync: ${dateFrom} to ${dateTo}`
    } else if (action === 'refresh' || action === 'immediate') {
      // Immediate refresh from website button
      syncRequestData.sync_type = 'manual'
      syncRequestData.requested_by = 'website-refresh-button'
      syncRequestData.result = 'Immediate refresh sync from website'
    } else if (action === 'sync-employees' || syncType === 'employees') {
      // Employee sync from IDE or website
      syncRequestData.sync_type = 'employees'
      syncRequestData.requested_by = requestedBy || 'employee-sync-trigger'
      syncRequestData.result = 'Sync all employee names from SmartOffice'
    } else if (autoDetectRange) {
      syncRequestData.sync_type = 'discover'
      syncRequestData.result = 'Auto-detect historical range and sync all available data'
    } else {
      // Default manual sync
      syncRequestData.result = 'Manual sync request'
    }

    // Create sync request
    const { data: syncRequest, error: insertError } = await supabase
      .from('sync_requests')
      .insert(syncRequestData)
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Check device status
    const { data: deviceStatus } = await supabase
      .from('device_status')
      .select('*')
      .single()

    // Prepare response message based on sync type
    let message = 'Sync request created successfully'
    let note = 'The Windows sync script will process this request within 10 seconds'
    
    if (dateFrom && dateTo) {
      message = `Historical sync requested for ${dateFrom} to ${dateTo}`
      note = 'Historical sync may take several minutes depending on data volume'
    } else if (action === 'refresh' || action === 'immediate') {
      message = 'Immediate refresh sync requested'
      note = 'Current data will be synced immediately (bypassing 5-second interval)'
    } else if (action === 'sync-employees' || syncType === 'employees') {
      message = 'Employee names sync requested'
      note = 'All employee names will be fetched from SmartOffice and updated in database'
    } else if (autoDetectRange) {
      message = 'Auto-detect and sync all historical data requested'
      note = 'The script will discover available data range and sync everything'
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        syncRequest,
        deviceStatus,
        dateRange: dateFrom && dateTo ? { dateFrom, dateTo } : null,
        autoDetectRange,
        immediateRefresh: action === 'refresh' || action === 'immediate',
        employeeSync: action === 'sync-employees' || syncType === 'employees',
        note
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
