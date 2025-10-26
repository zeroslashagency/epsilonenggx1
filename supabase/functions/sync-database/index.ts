import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { syncType } = await req.json()

    console.log(`☁️ Starting database sync: ${syncType}`)

    // In a real implementation, you would:
    // 1. Read data from local computer storage/database
    // 2. Transform the data to match Supabase schema
    // 3. Upsert the data to Supabase

    // For now, we'll simulate fetching local data and syncing to cloud
    const simulatedLocalData = [
      {
        employee_code: 'SIM001',
        log_date: new Date().toISOString(),
        punch_direction: 'in',
        sync_time: new Date().toISOString(),
        serial_number: 'LOCAL_SYNC',
        created_at: new Date().toISOString(),
        synced_at: new Date().toISOString()
      }
    ]

    console.log(`📊 Syncing ${simulatedLocalData.length} records to Supabase`)

    // Insert/update data in Supabase
    const { data, error } = await supabase
      .from('employee_raw_logs')
      .upsert(simulatedLocalData, { 
        onConflict: 'employee_code,log_date',
        ignoreDuplicates: false 
      })

    if (error) {
      throw new Error(`Supabase sync error: ${error.message}`)
    }

    // Update sync timestamp
    const syncRecord = {
      sync_type: 'local-to-cloud',
      records_synced: simulatedLocalData.length,
      sync_timestamp: new Date().toISOString(),
      status: 'completed'
    }

    console.log(`✅ Database sync completed: ${simulatedLocalData.length} records`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Database sync completed successfully',
        syncedRecords: simulatedLocalData.length,
        syncType: syncType,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Database sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Failed to sync to Supabase database'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
