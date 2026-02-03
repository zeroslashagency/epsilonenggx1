/***
 * Session Cache Service
 * 
 * In-memory LRU cache for user sessions and permissions.
 * Reduces Supabase calls from 2-4 per request to 0-1.
 ***/

interface CachedSession {
    user: {
        id: string
        email: string
        full_name?: string
        role: string
        role_badge?: string
    }
    permissions: string[]
    rolePermissionsJson?: any
    cachedAt: number
    expiresAt: number
}

// LRU Cache Implementation
class SessionCache {
    private cache = new Map<string, CachedSession>()
    private readonly maxSize: number
    private readonly defaultTTL: number // in milliseconds

    constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) { // 5 minutes default
        this.maxSize = maxSize
        this.defaultTTL = defaultTTL
    }

    /**
     * Get cached session by token hash
     */
    get(tokenHash: string): CachedSession | null {
        const session = this.cache.get(tokenHash)

        if (!session) {
            return null
        }

        // Check if expired
        if (Date.now() > session.expiresAt) {
            this.cache.delete(tokenHash)
            return null
        }

        // Move to front (LRU behavior)
        this.cache.delete(tokenHash)
        this.cache.set(tokenHash, session)

        return session
    }

    /**
     * Set session in cache
     */
    set(tokenHash: string, user: CachedSession['user'], permissions: string[], rolePermissionsJson?: any): void {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey) {
                this.cache.delete(oldestKey)
            }
        }

        const now = Date.now()
        this.cache.set(tokenHash, {
            user,
            permissions,
            rolePermissionsJson,
            cachedAt: now,
            expiresAt: now + this.defaultTTL
        })
    }

    /**
     * Invalidate all sessions for a user ID
     * Called when user's role/permissions change
     */
    invalidateUser(userId: string): number {
        let invalidated = 0
        for (const [key, session] of this.cache.entries()) {
            if (session.user.id === userId) {
                this.cache.delete(key)
                invalidated++
            }
        }
        return invalidated
    }

    /**
     * Invalidate all sessions for a role
     * Called when role permissions change
     */
    invalidateRole(roleName: string): number {
        let invalidated = 0
        for (const [key, session] of this.cache.entries()) {
            if (session.user.role === roleName) {
                this.cache.delete(key)
                invalidated++
            }
        }
        return invalidated
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number; hitRate?: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        }
    }
}

// Simple hash function for tokens (not cryptographic, just for cache keys)
function hashToken(token: string): string {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
    }
    return `session_${hash.toString(36)}`
}

// Singleton instance
const sessionCache = new SessionCache()

// Export public API
export const getSessionCache = () => sessionCache
export const getCachedSession = (token: string) => sessionCache.get(hashToken(token))
export const setCachedSession = (
    token: string,
    user: CachedSession['user'],
    permissions: string[],
    rolePermissionsJson?: any
) => sessionCache.set(hashToken(token), user, permissions, rolePermissionsJson)
export const invalidateUserSessions = (userId: string) => sessionCache.invalidateUser(userId)
export const invalidateRoleSessions = (roleName: string) => sessionCache.invalidateRole(roleName)
export const clearSessionCache = () => sessionCache.clear()
export const getSessionCacheStats = () => sessionCache.getStats()

export type { CachedSession }
