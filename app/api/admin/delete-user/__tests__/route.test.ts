import { POST } from '../route'

// RPC mock — the route now calls getSupabaseForRequest(request).rpc('app_admin_delete_user', ...)
const mockRpc = jest.fn(() => Promise.resolve({ data: 'deleted-uuid', error: null }))

jest.mock('next/server', () => {
  return {
    NextResponse: class extends Response {
      static json(body: any, init?: ResponseInit) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: { ...init?.headers, 'Content-Type': 'application/json' },
        })
      }
    },
    NextRequest: class extends Request {},
  }
})

jest.mock('@/app/lib/features/auth/auth.middleware', () => ({
  requirePermission: jest.fn(() => ({
    id: 'test-admin-id',
    email: 'admin@example.com',
    role: 'Super Admin',
  })),
}))

jest.mock('@/app/lib/middleware/csrf-protection', () => ({
  requireCSRFToken: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('@/app/lib/services/supabase-client', () => ({
  getSupabaseForRequest: jest.fn(() => ({ rpc: mockRpc })),
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/admin/delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/delete-user (RPC-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: 'deleted-uuid', error: null })
  })

  it('deletes a user successfully via the RPC', async () => {
    const response = await POST(makeRequest({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userEmail: 'test@example.com',
      userName: 'Test User',
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('app_admin_delete_user', {
      target: '123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('returns 403 when the DB gate rejects a non-admin caller', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'FORBIDDEN: admin privilege required', code: '42501' },
    })

    const response = await POST(makeRequest({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      userEmail: 'x@example.com',
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('returns 409 when trying to delete the last Super Admin', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'CONFLICT: cannot delete the last Super Admin', code: 'P0001' },
    })

    const response = await POST(makeRequest({
      userId: '123e4567-e89b-12d3-a456-426614174002',
      userEmail: 'super@example.com',
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('last Super Admin')
  })

  it('returns 409 on self-delete attempt', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'CONFLICT: cannot delete your own account', code: 'P0001' },
    })

    const response = await POST(makeRequest({
      userId: '123e4567-e89b-12d3-a456-426614174003',
      userEmail: 'self@example.com',
    }) as any)
    const data = await response.json()

    expect(response.status).toBe(409)
  })

  it('rejects a request without userId', async () => {
    const response = await POST(makeRequest({ userEmail: 'test@example.com' }) as any)
    expect(response.status).toBe(400)
  })

  it('rejects invalid uuid / email via Zod', async () => {
    const response = await POST(makeRequest({
      userId: 'invalid-uuid',
      userEmail: 'invalid-email',
    }) as any)
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
