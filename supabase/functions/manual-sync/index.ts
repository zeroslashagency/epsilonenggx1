import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    const { syncType } = await req.json()
    
    console.log(`Manual sync requested for: ${syncType}`)
    
    // Store sync request in Supabase
    const { data, error } = await supabaseClient
      .from('sync_requests')
      .insert({
        sync_type: syncType,
        status: 'pending',
        requested_at: new Date().toISOString(),
        requested_by: 'dashboard'
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create sync request: ${error.message}`)
    }
    
    console.log(`Sync request created with ID: ${data.id}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manual sync request queued successfully',
        requestId: data.id,
        syncType: syncType,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('Manual sync error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})