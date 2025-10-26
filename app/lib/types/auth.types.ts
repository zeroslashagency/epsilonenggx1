/**
 * Authentication Types
 * Type definitions for authentication and authorization
 */

export interface User {
  id: string
  email: string
  full_name?: string
  role?: string
  role_badge?: string
  created_at?: string
}

export interface AuthSession {
  user: User
  access_token: string
  refresh_token?: string
  expires_at?: number
}

export interface JWTPayload {
  sub: string // user id
  email: string
  role?: string
  iat?: number // issued at
  exp?: number // expiration
}

export interface AuthRequest extends Request {
  user?: User
  session?: AuthSession
}

export type UserRole = 
  | 'Super Admin'
  | 'Admin'
  | 'Manager'
  | 'Employee'
  | 'Viewer'

export interface RolePermissions {
  role: UserRole
  permissions: string[]
  canAccessAdmin: boolean
  canManageUsers: boolean
  canManageRoles: boolean
  canViewReports: boolean
  canManageAttendance: boolean
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 5,
  'Admin': 4,
  'Manager': 3,
  'Employee': 2,
  'Viewer': 1
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  'Super Admin': {
    role: 'Super Admin',
    permissions: ['*'], // All permissions
    canAccessAdmin: true,
    canManageUsers: true,
    canManageRoles: true,
    canViewReports: true,
    canManageAttendance: true
  },
  'Admin': {
    role: 'Admin',
    permissions: ['users:read', 'users:write', 'roles:read', 'reports:read', 'attendance:*'],
    canAccessAdmin: true,
    canManageUsers: true,
    canManageRoles: false,
    canViewReports: true,
    canManageAttendance: true
  },
  'Manager': {
    role: 'Manager',
    permissions: ['users:read', 'reports:read', 'attendance:read', 'attendance:write'],
    canAccessAdmin: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewReports: true,
    canManageAttendance: true
  },
  'Employee': {
    role: 'Employee',
    permissions: ['attendance:read', 'profile:read', 'profile:write'],
    canAccessAdmin: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewReports: false,
    canManageAttendance: false
  },
  'Viewer': {
    role: 'Viewer',
    permissions: ['reports:read'],
    canAccessAdmin: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewReports: true,
    canManageAttendance: false
  }
}
