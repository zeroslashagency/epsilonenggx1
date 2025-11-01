/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/user
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (consider Redis for production)
const store: RateLimitStore = {}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

// Default rate limits
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  page: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 page loads per minute
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier

  // Clean up expired entries
  if (store[key] && store[key].resetTime < now) {
    delete store[key]
  }

  // Initialize or get existing entry
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  const entry = store[key]

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment counter
  entry.count++

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(
  ipAddress: string,
  userId?: string,
  endpoint?: string
): string {
  // Prefer user ID if available, fallback to IP
  const identifier = userId || ipAddress
  return endpoint ? `${identifier}:${endpoint}` : identifier
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}
