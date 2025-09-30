import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use environment variables for better security and deployment flexibility
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNTI4NCwiZXhwIjoyMDcyMjAxMjg0fQ.0cGxdfGQhYldGHLndKqcYAtzwHjCYnAXSB1WAqRFZ9U'

// Use globalThis to ensure true singleton across module reloads in development
// This prevents multiple instances during Next.js hot reloading
declare global {
  var __supabaseInstance: SupabaseClient | undefined
  var __supabaseAdminInstance: SupabaseClient | undefined
}

// Client-side Supabase instance (anon key)
export function getSupabaseClient(): SupabaseClient {
  // Always check globalThis first to ensure true singleton
  if (!globalThis.__supabaseInstance) {
    globalThis.__supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'epsilon-auth'
      }
    })
  }
  return globalThis.__supabaseInstance
}

// Server-side Supabase instance (service role key)
export function getSupabaseAdminClient(): SupabaseClient {
  // Always check globalThis first to ensure true singleton
  if (!globalThis.__supabaseAdminInstance) {
    globalThis.__supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return globalThis.__supabaseAdminInstance
}

// Default export for backward compatibility - but only create if needed
export const supabase = getSupabaseClient()

// Export configuration values
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceKey: supabaseServiceKey
}
