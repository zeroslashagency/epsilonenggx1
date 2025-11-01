/**
 * Supabase Client Service
 * Provides secure, centralized access to Supabase database
 * 
 * @module supabase-client
 * @security CRITICAL - Never hardcode API keys
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables (validation happens lazily in respective functions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton instances to prevent multiple GoTrueClient warnings
let clientInstance: SupabaseClient | null = null
let browserClientInstance: SupabaseClient | null = null
let adminClientInstance: SupabaseClient | null = null

// Note: Validation is deferred until client creation to support build-time imports
// Environment variables may not be available during Next.js build process

/**
 * Global type declarations for singleton instances
 * Using globalThis ensures single instance across Next.js hot reloads
 */
declare global {
  var __supabaseInstance: SupabaseClient | undefined
  var __supabaseAdminInstance: SupabaseClient | undefined
}

/**
 * Get server-side Supabase instance (anon key)
 * For use in API routes and server components
 * Does NOT persist sessions
 * 
 * @returns {SupabaseClient} Singleton Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance
  }
  
  // Validate at runtime when client is actually needed
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
  
  // Create and cache instance (server-side config)
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Disable session persistence for server-side
      autoRefreshToken: false,
    },
  })
  
  return clientInstance
}

/**
 * Get browser-side Supabase instance (anon key)
 * For use in client components and auth context
 * PERSISTS sessions to localStorage
 * 
 * @returns {SupabaseClient} Singleton browser Supabase client
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  // Return existing instance if available
  if (browserClientInstance) {
    return browserClientInstance
  }
  
  // Validate at runtime
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
  
  // Create and cache instance (browser-side config)
  browserClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, // ✅ Persist sessions to localStorage
      autoRefreshToken: true, // ✅ Auto-refresh tokens
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  
  return browserClientInstance
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
 * Note: This creates the client lazily on first access to avoid build-time errors
 * @deprecated Use getSupabaseBrowserClient() for client-side or getSupabaseClient() for server-side
 */
let _supabaseInstance: SupabaseClient | null = null
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabaseInstance) {
      // Use browser client if in browser context, otherwise server client
      _supabaseInstance = typeof window !== 'undefined' 
        ? getSupabaseBrowserClient() 
        : getSupabaseClient()
    }
    return (_supabaseInstance as any)[prop]
  }
})

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

}
