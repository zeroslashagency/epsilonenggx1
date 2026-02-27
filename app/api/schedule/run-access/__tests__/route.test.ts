jest.mock('next/server', () => {
  return {
    NextResponse: class extends Response {
      static json(body: any, init?: ResponseInit) {
        return new (this as any)(JSON.stringify(body), {
          ...init,
          headers: {
            ...init?.headers,
            'Content-Type': 'application/json',
          },
        })
      }
    },
    NextRequest: class extends Request {},
  }
})

import { NextResponse } from 'next/server'
import { GET, POST } from '../route'
import { hasPermission, requireAuth } from '@/app/lib/features/auth/auth.middleware'

jest.mock('@/app/lib/features/auth/auth.middleware', () => ({
  requireAuth: jest.fn(),
  hasPermission: jest.fn(),
}))

const mockedRequireAuth = requireAuth as jest.Mock
const mockedHasPermission = hasPermission as jest.Mock

describe('schedule run-access route', () => {
  beforeEach(() => {
    mockedRequireAuth.mockReset()
    mockedHasPermission.mockReset()

    mockedRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'Employee',
    })
  })

  it('GET returns profile access matrix', async () => {
    mockedHasPermission.mockImplementation(async (_user: any, permission: string) => {
      return permission === 'schedule.run.basic'
    })

    const response = await GET(new Request('http://localhost/api/schedule/run-access') as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.canRunBasic).toBe(true)
    expect(payload.data.canRunAdvanced).toBe(false)
    expect(payload.data.availableProfiles).toEqual(['basic'])
  })

  it('POST blocks advanced mode when user has only basic access', async () => {
    mockedHasPermission.mockImplementation(async (_user: any, permission: string) => {
      return permission === 'schedule.run.basic'
    })

    const response = await POST(
      new Request('http://localhost/api/schedule/run-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileMode: 'advanced' }),
      }) as any
    )

    const payload = await response.json()
    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
  })

  it('POST allows advanced mode when user has advanced access', async () => {
    mockedHasPermission.mockImplementation(async (_user: any, permission: string) => {
      return permission === 'schedule.run.advanced'
    })

    const response = await POST(
      new Request('http://localhost/api/schedule/run-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileMode: 'advanced' }),
      }) as any
    )

    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.profileMode).toBe('advanced')
  })

  it('returns auth response when authentication fails', async () => {
    mockedRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET(new Request('http://localhost/api/schedule/run-access') as any)
    expect(response.status).toBe(401)
  })
})
