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
    NextRequest: class extends Request {},
  }
})

import { NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { GET as getUsers, PATCH as patchUsers } from '../users/route'
import { GET as getRoles, POST as postRoles } from '../roles/route'
import { POST as runMigration } from '../run-migration/route'

jest.mock('@/app/lib/features/auth/auth.middleware', () => ({
  requirePermission: jest.fn(),
}))

const mockedRequirePermission = requirePermission as jest.Mock

describe('admin route permission guard matrix', () => {
  beforeEach(() => {
    mockedRequirePermission.mockReset()
    mockedRequirePermission.mockResolvedValue(
      NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 })
    )
  })

  it('users GET requires users.view', async () => {
    await getUsers(new Request('http://localhost/api/admin/users') as any)
    expect(mockedRequirePermission).toHaveBeenCalledWith(expect.any(Object), 'users.view')
  })

  it('users PATCH requires manage_users', async () => {
    await patchUsers(
      new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }) as any
    )
    expect(mockedRequirePermission).toHaveBeenCalledWith(expect.any(Object), 'manage_users')
  })

  it('roles GET requires roles.view', async () => {
    await getRoles(new Request('http://localhost/api/admin/roles') as any)
    expect(mockedRequirePermission).toHaveBeenCalledWith(expect.any(Object), 'roles.view')
  })

  it('roles POST requires roles.manage', async () => {
    await postRoles(
      new Request('http://localhost/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as any
    )
    expect(mockedRequirePermission).toHaveBeenCalledWith(expect.any(Object), 'roles.manage')
  })

  it('run-migration POST requires roles.manage', async () => {
    await runMigration(
      new Request('http://localhost/api/admin/run-migration', {
        method: 'POST',
      }) as any
    )
    expect(mockedRequirePermission).toHaveBeenCalledWith(expect.any(Object), 'roles.manage')
  })
})
