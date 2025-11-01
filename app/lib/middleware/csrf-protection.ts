/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a random CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get or create CSRF token
 */
export function getCSRFToken(): string {
  const cookieStore = cookies()
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value
  
  if (!token) {
    token = generateCSRFToken()
  }
  
  return token
}

/**
 * Set CSRF token in cookie
 */
export function setCSRFToken(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
  const method = request.method
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }
  
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value
  
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  
  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }
  
  return cookieToken === headerToken
}

/**
 * CSRF protection middleware
 * Returns null if valid, or 403 response if invalid
 */
export async function requireCSRFToken(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!verifyCSRFToken(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or missing CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      },
      { status: 403 }
    )
  }
  
  return null
}

/**
 * Wrapper for API routes with CSRF protection
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Check CSRF token
    const csrfResponse = await requireCSRFToken(request)
    if (csrfResponse) {
      return csrfResponse
    }
    
    // Continue to handler
    return handler(request)
  }
}
