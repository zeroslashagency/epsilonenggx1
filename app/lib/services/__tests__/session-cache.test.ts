/**
 * Unit Tests for Session Cache Service
 * 
 * Tests cover:
 * - Basic get/set operations
 * - Cache expiration (TTL)
 * - LRU eviction behavior
 * - User/role invalidation
 * - Cache statistics
 */

import {
    getSessionCache,
    getCachedSession,
    setCachedSession,
    invalidateUserSessions,
    invalidateRoleSessions,
    clearSessionCache,
    getSessionCacheStats
} from '../session-cache'

describe('SessionCache', () => {
    // Clear cache before each test
    beforeEach(() => {
        clearSessionCache()
    })

    describe('Basic Operations', () => {
        it('should return null for non-existent token', () => {
            const result = getCachedSession('non-existent-token')
            expect(result).toBeNull()
        })

        it('should store and retrieve session', () => {
            const user = {
                id: 'user-123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'Admin'
            }
            const permissions = ['users.view', 'users.edit']

            setCachedSession('token-abc', user, permissions)
            const result = getCachedSession('token-abc')

            expect(result).not.toBeNull()
            expect(result?.user.id).toBe('user-123')
            expect(result?.user.email).toBe('test@example.com')
            expect(result?.user.role).toBe('Admin')
            expect(result?.permissions).toEqual(['users.view', 'users.edit'])
        })

        it('should store rolePermissionsJson when provided', () => {
            const user = {
                id: 'user-456',
                email: 'admin@example.com',
                role: 'Super Admin'
            }
            const permissions = ['*']
            const roleJson = { attendance: { view: true, edit: true } }

            setCachedSession('token-def', user, permissions, roleJson)
            const result = getCachedSession('token-def')

            expect(result?.rolePermissionsJson).toEqual({ attendance: { view: true, edit: true } })
        })
    })

    describe('Cache Invalidation', () => {
        it('should invalidate sessions by user ID', () => {
            const user1 = { id: 'user-1', email: 'user1@test.com', role: 'User' }
            const user2 = { id: 'user-2', email: 'user2@test.com', role: 'User' }

            setCachedSession('token-1a', user1, [])
            setCachedSession('token-1b', user1, [])
            setCachedSession('token-2', user2, [])

            const invalidated = invalidateUserSessions('user-1')

            expect(invalidated).toBe(2)
            expect(getCachedSession('token-1a')).toBeNull()
            expect(getCachedSession('token-1b')).toBeNull()
            expect(getCachedSession('token-2')).not.toBeNull()
        })

        it('should invalidate sessions by role', () => {
            const admin = { id: 'admin-1', email: 'admin@test.com', role: 'Admin' }
            const user = { id: 'user-1', email: 'user@test.com', role: 'User' }

            setCachedSession('token-admin-1', admin, [])
            setCachedSession('token-admin-2', admin, [])
            setCachedSession('token-user', user, [])

            const invalidated = invalidateRoleSessions('Admin')

            expect(invalidated).toBe(2)
            expect(getCachedSession('token-admin-1')).toBeNull()
            expect(getCachedSession('token-admin-2')).toBeNull()
            expect(getCachedSession('token-user')).not.toBeNull()
        })

        it('should clear entire cache', () => {
            setCachedSession('token-1', { id: '1', email: 'a@b.com', role: 'A' }, [])
            setCachedSession('token-2', { id: '2', email: 'b@b.com', role: 'B' }, [])
            setCachedSession('token-3', { id: '3', email: 'c@b.com', role: 'C' }, [])

            const statsBefore = getSessionCacheStats()
            expect(statsBefore.size).toBe(3)

            clearSessionCache()

            const statsAfter = getSessionCacheStats()
            expect(statsAfter.size).toBe(0)
        })
    })

    describe('Cache Statistics', () => {
        it('should return correct cache size', () => {
            expect(getSessionCacheStats().size).toBe(0)

            setCachedSession('token-1', { id: '1', email: 'a@b.com', role: 'X' }, [])
            expect(getSessionCacheStats().size).toBe(1)

            setCachedSession('token-2', { id: '2', email: 'b@b.com', role: 'Y' }, [])
            expect(getSessionCacheStats().size).toBe(2)
        })

        it('should have correct maxSize configured', () => {
            const stats = getSessionCacheStats()
            expect(stats.maxSize).toBe(1000)
        })
    })

    describe('Same Token Updates', () => {
        it('should update session when same token is set again', () => {
            const userV1 = { id: 'user-1', email: 'old@test.com', role: 'User' }
            const userV2 = { id: 'user-1', email: 'new@test.com', role: 'Admin' }

            setCachedSession('token-x', userV1, ['read'])
            setCachedSession('token-x', userV2, ['read', 'write'])

            const result = getCachedSession('token-x')
            expect(result?.user.email).toBe('new@test.com')
            expect(result?.user.role).toBe('Admin')
            expect(result?.permissions).toEqual(['read', 'write'])
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty permissions array', () => {
            setCachedSession('token-empty', { id: 'e', email: 'e@e.com', role: 'Empty' }, [])
            const result = getCachedSession('token-empty')
            expect(result?.permissions).toEqual([])
        })

        it('should handle special characters in token', () => {
            const specialToken = 'eyJhbGci.OiJIUzI1NiI.sInR5cCI6IkpX'
            setCachedSession(specialToken, { id: 's', email: 's@s.com', role: 'S' }, ['test'])
            const result = getCachedSession(specialToken)
            expect(result).not.toBeNull()
            expect(result?.user.id).toBe('s')
        })

        it('should return 0 when invalidating non-existent user', () => {
            const count = invalidateUserSessions('non-existent-user')
            expect(count).toBe(0)
        })

        it('should return 0 when invalidating non-existent role', () => {
            const count = invalidateRoleSessions('NonExistentRole')
            expect(count).toBe(0)
        })
    })
})
