import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmartOfficeLog {
  EmployeeCode: string
  LogDate: string
  PunchDirection: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { fromDate, toDate, smartofficeUrl, smartofficeApiKey } = await req.json()

    console.log('🔄 Sync Historical Data Edge Function')
    console.log('📅 Date Range:', fromDate, 'to', toDate)

    // Validate inputs
    if (!fromDate || !toDate) {
      throw new Error('fromDate and toDate are required')
    }

    if (!smartofficeUrl || !smartofficeApiKey) {
      throw new Error('SmartOffice URL and API key are required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch data from SmartOffice API
    console.log('📡 Fetching data from SmartOffice...')
    const smartofficeResponse = await fetch(
      `${smartofficeUrl}/GetDeviceLogs?apikey=${smartofficeApiKey}&fromdate=${fromDate}&todate=${toDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!smartofficeResponse.ok) {
      throw new Error(`SmartOffice API error: ${smartofficeResponse.statusText}`)
    }

    const rawLogs: SmartOfficeLog[] = await smartofficeResponse.json()
    console.log(`📊 Fetched ${rawLogs.length} raw logs from SmartOffice`)

    if (rawLogs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No logs found for the specified date range',
          stored: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Transform and clean the data
    const syncTimestamp = new Date().toISOString()
    const cleanLogs = rawLogs
      .map((log) => ({
        employee_code: String(log.EmployeeCode || ''),
        log_date: log.LogDate,
        punch_direction: (log.PunchDirection || 'unknown').toLowerCase(),
        sync_time: syncTimestamp,
      }))
      .filter(
        (log) =>
          log.employee_code &&
          log.log_date &&
          ['in', 'out'].includes(log.punch_direction)
      )

    console.log(`✅ Cleaned ${cleanLogs.length} logs for storage`)

    // Store in Supabase in batches of 1000
    const batchSize = 1000
    let totalStored = 0
    let totalErrors = 0

    for (let i = 0; i < cleanLogs.length; i += batchSize) {
      const batch = cleanLogs.slice(i, i + batchSize)
      
      console.log(`💾 Storing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cleanLogs.length / batchSize)} (${batch.length} records)`)

      const { error } = await supabase
        .from('employee_raw_logs')
        .upsert(batch, {
          onConflict: 'employee_code,log_date,punch_direction',
          ignoreDuplicates: true,
        })

      if (error) {
        console.error(`❌ Error storing batch:`, error.message)
        totalErrors += batch.length
      } else {
        totalStored += batch.length
      }
    }

    // Update device status
    await supabase
      .from('device_status')
      .upsert({
        status: 'online',
        last_sync: syncTimestamp,
        error_message: null,
      })

    console.log(`✅ Sync complete: ${totalStored} stored, ${totalErrors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced historical data`,
        dateRange: { fromDate, toDate },
        fetched: rawLogs.length,
        cleaned: cleanLogs.length,
        stored: totalStored,
        errors: totalErrors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
