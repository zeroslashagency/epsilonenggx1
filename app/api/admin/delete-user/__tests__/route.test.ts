// Mock content for replacement
import { POST } from '../route'

// Mock next/server to handle NextResponse.json
// Mock next/server to handle NextResponse.json
jest.mock('next/server', () => {
  return {
    NextResponse: class extends Response {
      static json(body: any, init?: ResponseInit) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: {
            ...init?.headers,
            'Content-Type': 'application/json',
          },
        })
      }
    },
    // Alias NextRequest to standard Request for type compatibility if needed runtime
    NextRequest: class extends Request { },
  }
})

// Mock the auth middleware
jest.mock('@/app/lib/features/auth/auth.middleware', () => ({
  requirePermission: jest.fn((request, permission) => {
    // Mock authenticated user
    return {
      id: 'test-user-id',
      email: 'admin@example.com',
      role: 'Super Admin',
    }
  }),
}))

// Mock CSRF protection
jest.mock('@/app/lib/middleware/csrf-protection', () => ({
  requireCSRFToken: jest.fn(() => Promise.resolve(null)),
}))

// Mock Supabase client
jest.mock('@/app/lib/services/supabase-client', () => ({
  getSupabaseAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        deleteUser: jest.fn(() => Promise.resolve({ error: null }))
      }
    },
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

    const request = new Request('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    // No need to spy on json(), standard request has it.
    // jest.spyOn(request, 'json').mockResolvedValue(requestBody) 
    // But Request body is stream, need to init with body string.

    // CASTING to any or NextRequest to satisfy route handler signature which expects NextRequest
    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should reject request without userId', async () => {
    const requestBody = {
      userEmail: 'test@example.com',
    }

    const request = new Request('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('should validate input with Zod schema', async () => {
    const requestBody = {
      userId: 'invalid-uuid',
      userEmail: 'invalid-email',
    }

    const request = new Request('http://localhost:3000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request as any)

    // Should fail validation
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
