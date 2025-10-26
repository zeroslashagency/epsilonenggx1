/**
 * API Client Utility
 * Handles authenticated API requests with automatic token management
 */

import { getSupabaseClient } from '@/app/lib/services/supabase-client'

/**
 * Make an authenticated API request
 * Automatically includes JWT token from Supabase session
 */
export async function apiClient(url: string, options: RequestInit = {}) {
  const supabase = getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add authorization header if user is logged in
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  // Merge with existing headers
  if (options.headers) {
    Object.assign(headers, options.headers)
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  // Handle 401 Unauthorized - redirect to login
  if (!response.ok && response.status === 401) {
    console.warn('🔒 Unauthorized request - redirecting to login')
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized - please login')
  }
  
  return response
}

/**
 * GET request helper
 */
export async function apiGet(url: string) {
  const response = await apiClient(url, { method: 'GET' })
  return response.json()
}

/**
 * POST request helper
 */
export async function apiPost(url: string, data: any) {
  const response = await apiClient(url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return response.json()
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
