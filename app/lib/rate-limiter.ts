// Simple in-memory rate limiter for development
// In production, use Redis-based rate limiting

interface RateLimitEntry {
  count: number
  resetTime: number
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private limit: number
  private windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }

  async check(key: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const now = Date.now()
    const entry = this.store.get(key)

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      this.store.delete(key)
    }

    const currentEntry = this.store.get(key)

    if (!currentEntry) {
      // First request in window
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      })
      
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: now + this.windowMs
      }
    }

    if (currentEntry.count >= this.limit) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: currentEntry.resetTime
      }
    }

    // Increment count
    currentEntry.count++
    this.store.set(key, currentEntry)

    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - currentEntry.count,
      reset: currentEntry.resetTime
    }
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Rate limiters for different operations
export const permissionUpdateLimiter = new InMemoryRateLimiter(
  10, // 10 requests
  60 * 1000 // per minute
)

export const userListLimiter = new InMemoryRateLimiter(
  60, // 60 requests
  60 * 1000 // per minute
)

export const activityLogLimiter = new InMemoryRateLimiter(
  30, // 30 requests
  60 * 1000 // per minute
)

// Cleanup old entries every 5 minutes
setInterval(() => {
  permissionUpdateLimiter.cleanup()
  userListLimiter.cleanup()
  activityLogLimiter.cleanup()
}, 5 * 60 * 1000)

// ✅ SECURITY FIX: Removed console.log that exposed rate limit config

