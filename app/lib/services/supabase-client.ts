/**
 * Supabase Client Service
 * Provides secure, centralized access to Supabase database
 * 
 * @module supabase-client
 * @security CRITICAL - Never hardcode API keys
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables (validation happens in respective functions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate client-side required variables
if (!supabaseUrl) {
  throw new Error(
    '❌ NEXT_PUBLIC_SUPABASE_URL is required. Please check your .env.local file.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please check your .env.local file.'
  )
}

// Note: SUPABASE_SERVICE_ROLE_KEY is only validated when getSupabaseAdminClient() is called
// This allows client-side code to import this module without errors

/**
 * Global type declarations for singleton instances
 * Using globalThis ensures single instance across Next.js hot reloads
 */
declare global {
  var __supabaseInstance: SupabaseClient | undefined
  var __supabaseAdminInstance: SupabaseClient | undefined
}

/**
 * Get client-side Supabase instance (anon key)
 * Safe for use in browser/client components
 * 
 * @returns {SupabaseClient} Singleton Supabase client instance
 * @example
 * const supabase = getSupabaseClient()
 * const { data } = await supabase.from('roles').select()
 */
export function getSupabaseClient(): SupabaseClient {
  if (!globalThis.__supabaseInstance) {
    globalThis.__supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
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

/**
 * Get server-side Supabase instance (service role key)
 * ONLY use in API routes - has full database access
 * 
 * @returns {SupabaseClient} Singleton admin Supabase client
 * @security CRITICAL - Only use server-side
 * @example
 * // In API route:
 * const supabase = getSupabaseAdminClient()
 * const { data } = await supabase.from('roles').select()
 */
export function getSupabaseAdminClient(): SupabaseClient {
  // Validate service role key (only needed server-side)
  if (!supabaseServiceKey) {
    throw new Error(
      '❌ SUPABASE_SERVICE_ROLE_KEY is required for admin client. ' +
      'This function should only be called server-side (API routes). ' +
      'Please check your .env.local file.'
    )
  }

  if (!globalThis.__supabaseAdminInstance) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 Creating Supabase Admin Client')
      console.log('URL:', supabaseUrl)
    }
    
    globalThis.__supabaseAdminInstance = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return globalThis.__supabaseAdminInstance
}

/**
 * Default client export for backward compatibility
 * @deprecated Use getSupabaseClient() instead for better control
 */
export const supabase = getSupabaseClient()

/**
 * Validate Supabase configuration
 * Call this at application startup to ensure all required env vars are present
 * 
 * @throws {Error} If any required environment variable is missing
 */
export function validateSupabaseConfig(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required Supabase environment variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\nPlease check your .env.local file.`
    )
  }

  console.log('✅ Supabase configuration validated')
}
