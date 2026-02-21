/**
 * API Client Utility
 * Handles authenticated API requests with automatic token management
 */

import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null

  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))

  if (!cookie) return null
  return decodeURIComponent(cookie.split('=').slice(1).join('='))
}

function generateTokenHex(byteLength: number = 32): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(byteLength)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2).padEnd(byteLength * 2, '0')}`.slice(0, byteLength * 2)
}

function ensureCsrfToken(): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  let token = getCookieValue(CSRF_COOKIE_NAME)
  if (token) return token

  token = generateTokenHex(32)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Strict${secure}`
  return token
}

/**
 * Make an authenticated API request
 * Automatically includes JWT token from Supabase session
 */
export async function apiClient(url: string, options: RequestInit = {}) {
  const supabase = getSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  const method = (options.method || 'GET').toUpperCase()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add authorization header if user is logged in
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = ensureCsrfToken()
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken
    }
  }
  
  // Merge with existing headers
  if (options.headers) {
    Object.assign(headers, options.headers)
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  // Handle 401 Unauthorized - redirect to auth
  if (!response.ok && response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
    throw new Error('Unauthorized - please login')
  }
  
  return response
}

/**
 * GET request helper with cache-busting
 */
export async function apiGet(url: string) {
  try {
    // Add cache-busting timestamp to prevent browser/CDN caching
    const separator = url.includes('?') ? '&' : '?'
    const cacheBuster = `${separator}_t=${Date.now()}`
    const finalUrl = `${url}${cacheBuster}`
    
    const response = await apiClient(finalUrl, { 
      method: 'GET',
      cache: 'no-store', // Force no cache
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
    
    // Check if response is OK before parsing JSON
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `Server error: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      return {
        success: false,
        error: errorMessage,
        data: null
      }
    }
    
    return response.json()
  } catch (error) {
    console.error('❌ Network Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      data: null
    }
  }
}

/**
 * POST request helper
 */
export async function apiPost(url: string, data: any) {
  try {
    const response = await apiClient(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    
    // Check if response is OK before parsing JSON
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `Server error: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      console.error('❌ API Error:', errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    }
    
    return response.json()
  } catch (error) {
    console.error('❌ Network Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    }
  }
}

/**
 * PUT request helper
 */
export async function apiPut(url: string, data: any) {
  const response = await apiClient(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return response.json()
}

/**
 * PATCH request helper
 */
export async function apiPatch(url: string, data: any) {
  const response = await apiClient(url, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
  return response.json()
}

/**
 * DELETE request helper
 */
export async function apiDelete(url: string) {
  const response = await apiClient(url, { method: 'DELETE' })
  return response.json()
}
