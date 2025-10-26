/**
 * Authentication Middleware
 * Handles JWT verification and role-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { User, UserRole, ROLE_HIERARCHY } from '@/app/lib/types/auth.types'

/**
 * Extract user from Supabase session
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify token with Supabase
    const supabase = getSupabaseAdminClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error?.message)
      return null
    }

    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, role_badge')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        id: user.id,
        email: user.email || '',
        role: 'Employee' // Default role
      }
    }

    // Prioritize role_badge for super_admin (workaround for CHECK constraint)
    const userRole = profile.role_badge === 'super_admin' 
      ? 'Super Admin' 
      : (profile.role || profile.role_badge || 'Employee')

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: userRole
    }

  } catch (error) {
    console.error('getUserFromRequest error:', error)
    return null
  }
}

/**
 * Require authentication
 * Returns user or error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<User | NextResponse> {
  const user = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid access token.'
      },
      { status: 401 }
    )
  }

  return user
}

/**
 * Require specific role(s)
 * Returns user or error response
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<User | NextResponse> {
  const user = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid access token.'
      },
      { status: 401 }
    )
  }

  const userRole = user.role as UserRole

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
      },
      { status: 403 }
    )
  }

  return user
}

/**
 * Require minimum role level
 * Returns user or error response
 */
export async function requireMinRole(
  request: NextRequest,
  minRole: UserRole
): Promise<User | NextResponse> {
  const user = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid access token.'
      },
      { status: 401 }
    )
  }

  const userRole = user.role as UserRole
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[minRole]

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Access denied. Minimum required role: ${minRole}. Your role: ${userRole}`
      },
      { status: 403 }
    )
  }

  return user
}

/**
 * Check if user has permission
 * Pure RBAC: Checks only role-based permissions
 */
export async function hasPermission(user: User, permission: string): Promise<boolean> {
  // Super Admin has all permissions (check multiple variations for compatibility)
  if (user.role === 'Super Admin' || 
      user.role === 'super_admin' || 
      user.role_badge === 'super_admin') {
    return true
  }

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get user's roles from user_roles table
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
    
    if (!userRoles || userRoles.length === 0) {
      console.warn(`No roles found for user ${user.id}`)
      return false
    }
    
    const roleIds = userRoles.map(ur => ur.role_id)
    
    // Get role permissions for all user's roles (RBAC only)
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          code
        )
      `)
      .in('role_id', roleIds)
    
    // Collect all permissions from roles
    const allPermissions: string[] = []
    
    if (rolePermissions) {
      rolePermissions.forEach((rp: any) => {
        if (rp.permissions?.code) {
          allPermissions.push(rp.permissions.code)
        }
      })
    }
    
    // Check if user has the required permission
    return allPermissions.includes(permission)
    
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Get all permissions for a user
 * Pure RBAC: Returns only role-based permissions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get user's role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    // Super Admin has all permissions
    if (profile?.role === 'Super Admin') {
      return ['*'] // Wildcard for all permissions
    }
    
    // Get user's roles from user_roles table
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
    
    if (!userRoles || userRoles.length === 0) {
      return []
    }
    
    const roleIds = userRoles.map(ur => ur.role_id)
    
    // Get role permissions for all user's roles (RBAC only)
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          code
        )
      `)
      .in('role_id', roleIds)
    
    // Collect all permissions from roles
    const allPermissions: string[] = []
    
    if (rolePermissions) {
      rolePermissions.forEach((rp: any) => {
        if (rp.permissions?.code) {
          allPermissions.push(rp.permissions.code)
        }
      })
    }
    
    // Remove duplicates and return
    return [...new Set(allPermissions)]
    
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Require specific permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<User | NextResponse> {
  const user = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.'
      },
      { status: 401 }
    )
  }

  const hasAccess = await hasPermission(user, permission)
  
  if (!hasAccess) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required permission: ${permission}`
      },
      { status: 403 }
    )
  }

  return user
}

/**
 * Optional authentication
 * Returns user or null (no error)
 */
export async function optionalAuth(request: NextRequest): Promise<User | null> {
  return await getUserFromRequest(request)
}

/**
 * Create auth response headers
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Log authentication attempt
 */
export async function logAuthAttempt(
  userId: string | null,
  action: string,
  success: boolean,
  ip?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: action,
      meta_json: {
        success,
        ip,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to log auth attempt:', error)
  }
}
