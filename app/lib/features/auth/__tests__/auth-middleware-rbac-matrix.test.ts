import { hasPermission } from '../auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

jest.mock('@/app/lib/services/supabase-client', () => ({
  getSupabaseAdminClient: jest.fn(),
}))

const mockedGetSupabaseAdminClient = getSupabaseAdminClient as jest.Mock

const buildSupabaseMock = (permissionCodes: string[]) => ({
  from: jest.fn((table: string) => {
    if (table === 'user_roles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(async () => ({ data: [{ role_id: 'role-1' }], error: null })),
        })),
      }
    }

    if (table === 'role_permissions') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => ({
            data: permissionCodes.map(code => ({ permissions: { code } })),
            error: null,
          })),
        })),
      }
    }

    if (table === 'roles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: { id: 'role-1' }, error: null })),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  }),
})

describe('RBAC access matrix in hasPermission', () => {
  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'Admin',
  }

  beforeEach(() => {
    mockedGetSupabaseAdminClient.mockReset()
  })

  it('enforces users.view without granting manage_users', async () => {
    mockedGetSupabaseAdminClient.mockReturnValue(buildSupabaseMock(['users.view']))

    await expect(hasPermission(baseUser, 'users.view')).resolves.toBe(true)
    await expect(hasPermission(baseUser, 'manage_users')).resolves.toBe(false)
  })

  it('treats manage_users as a superset alias for users.view and users.edit', async () => {
    mockedGetSupabaseAdminClient.mockReturnValue(buildSupabaseMock(['manage_users']))

    await expect(hasPermission(baseUser, 'manage_users')).resolves.toBe(true)
    await expect(hasPermission(baseUser, 'users.view')).resolves.toBe(true)
    await expect(hasPermission(baseUser, 'users.edit')).resolves.toBe(true)
  })

  it('enforces roles.view without granting roles.manage', async () => {
    mockedGetSupabaseAdminClient.mockReturnValue(buildSupabaseMock(['roles.view']))

    await expect(hasPermission(baseUser, 'roles.view')).resolves.toBe(true)
    await expect(hasPermission(baseUser, 'roles.manage')).resolves.toBe(false)
  })

  it('treats roles.manage as a superset alias for roles.view', async () => {
    mockedGetSupabaseAdminClient.mockReturnValue(buildSupabaseMock(['roles.manage']))

    await expect(hasPermission(baseUser, 'roles.manage')).resolves.toBe(true)
    await expect(hasPermission(baseUser, 'roles.view')).resolves.toBe(true)
  })

  it('uses normalized role_badge for super admin bypass', async () => {
    const fromSpy = jest.fn()
    mockedGetSupabaseAdminClient.mockReturnValue({ from: fromSpy })

    await expect(
      hasPermission({ ...baseUser, role: 'Operator', role_badge: 'Super Admin' }, 'manage_users')
    ).resolves.toBe(true)
    expect(fromSpy).not.toHaveBeenCalled()
  })
})
