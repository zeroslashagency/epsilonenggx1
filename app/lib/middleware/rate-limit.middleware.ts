/**
 * Rate Limiting Middleware
 * Uses Upstash Redis for distributed rate limiting
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Check if Upstash is configured
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
const isUpstashConfigured = upstashUrl && upstashToken && 
  upstashUrl.startsWith('https://') && 
  !upstashUrl.includes('your_upstash')

// Initialize Redis client only if configured
let redis: Redis | null = null
let authRateLimit: Ratelimit | null = null
let apiRateLimit: Ratelimit | null = null
let strictRateLimit: Ratelimit | null = null
let permissionUpdateLimit: Ratelimit | null = null

if (isUpstashConfigured) {
  redis = new Redis({
    url: upstashUrl!,
    token: upstashToken!,
  })

  // Rate limiters for different use cases
  authRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 login attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  })

  apiRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 API requests per minute
    analytics: true,
    prefix: 'ratelimit:api',
  })

  strictRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute for sensitive operations
    analytics: true,
    prefix: 'ratelimit:strict',
  })

  permissionUpdateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 permission updates per 5 minutes
    analytics: true,
    prefix: 'ratelimit:permissions',
  })

  console.log('✅ Rate limiting enabled with Upstash Redis')
} else {
  console.warn('⚠️ Rate limiting disabled - Upstash Redis not configured')
  console.warn('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local')
}

export { authRateLimit, apiRateLimit, strictRateLimit, permissionUpdateLimit }

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  try {
    // If rate limiting is not configured, allow all requests
    if (!limiter) {
      return { success: true }
    }
    // Get client identifier (IP address)
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'anonymous'

    // Check rate limit
    const { success, limit, remaining, reset } = await limiter.limit(ip)

    if (!success) {
      console.warn(`Rate limit exceeded for IP: ${ip}`)
      
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Rate Limit Exceeded',
            message: 'Too many requests. Please try again later.',
            rateLimit: {
              limit,
              remaining: 0,
              reset: new Date(reset).toISOString()
            }
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
            }
          }
        )
      }
    }

    // Rate limit passed
    return { success: true }

  } catch (error) {
    // If rate limiting fails, log error but allow request
    // This prevents rate limiting from breaking the app
    console.error('Rate limit check failed:', error)
    return { success: true }
  }
}

/**
 * Get rate limit identifier from request
 * Can be customized to use user ID instead of IP
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  return request.ip || 
         request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'anonymous'
}

/**
 * Create custom rate limiter
 */
export function createRateLimit(requests: number, window: string, prefix: string) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  })
}
