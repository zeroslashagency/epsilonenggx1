/**
 * Delete User API Route Tests
 */

import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the auth middleware
jest.mock('@/app/lib/middleware/auth.middleware', () => ({
  requirePermission: jest.fn((request, permission) => {
    // Mock authenticated user
    return {
      id: 'test-user-id',
      email: 'admin@example.com',
      role: 'Super Admin',
    }
  }),
}))

// Mock Supabase client
jest.mock('@/app/lib/services/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}))

describe('DELETE /api/admin/delete-user', () => {
  it('should delete user successfully', async () => {
    const requestBody = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userEmail: 'test@example.com',
      userName: 'Test User',
    }

    const request = new NextRequest('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Mock request.json()
    jest.spyOn(request, 'json').mockResolvedValue(requestBody)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should reject request without userId', async () => {
    const requestBody = {
      userEmail: 'test@example.com',
    }

    const request = new NextRequest('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    jest.spyOn(request, 'json').mockResolvedValue(requestBody)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('should validate input with Zod schema', async () => {
    const requestBody = {
      userId: 'invalid-uuid',
      userEmail: 'invalid-email',
    }

    const request = new NextRequest('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    jest.spyOn(request, 'json').mockResolvedValue(requestBody)

    const response = await POST(request)
    
    // Should fail validation
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
