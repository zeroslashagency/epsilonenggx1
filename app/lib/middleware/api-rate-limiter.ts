/**
 * Global API Rate Limiter
 * Applies rate limiting to all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from './rate-limiter'

/**
 * Apply rate limiting to API request
 * Returns null if allowed, or NextResponse with 429 if rate limited
 */
export async function applyRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  // Get client IP
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  // Get endpoint path
  const endpoint = request.nextUrl.pathname
  
  // Create rate limit key
  const rateLimitKey = getRateLimitKey(ipAddress, userId, endpoint)
  
  // Check rate limit
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.api)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        rateLimitInfo: {
          limit: RATE_LIMITS.api.maxRequests,
          resetTime: rateLimit.resetTime,
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        }
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.api.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        }
      }
    )
  }
  
  // Rate limit check passed
  return null
}

/**
 * Wrapper for API routes with automatic rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Continue to handler
    return handler(request)
  }
}
