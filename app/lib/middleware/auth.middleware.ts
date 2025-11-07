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
    return Array.from(new Set(allPermissions))
    
  } catch (error) {
    return []
  }
}

/**
 * Require specific permission (OLD SYSTEM - for backward compatibility)
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
 * Require granular permission from permissions_json
 * NEW SYSTEM - checks role's permissions_json for granular permissions
 * 
 * @param request - Next.js request
 * @param module - Module key (e.g., 'production', 'monitoring')
 * @param item - Item key (e.g., 'Orders', 'Alerts')
 * @param permission - Permission type ('view', 'create', 'edit', 'delete', 'approve', 'export')
 * @returns User object or error response
 */
export async function requireGranularPermission(
  request: NextRequest,
  module: string,
  item: string,
  permission: string
): Promise<User | NextResponse> {
  // Step 1: Get authenticated user
  const user = await getUserFromRequest(request)
  
  if (!user) {
    console.log('❌ No authenticated user')
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.'
      },
      { status: 401 }
    )
  }
  
  console.log(`🔍 Checking permission: ${module}.${item}.${permission} for user: ${user.email} (${user.role})`)
  
  // Step 2: Super Admin bypass
  if (user.role === 'Super Admin' || user.role === 'super_admin' || user.role_badge === 'super_admin') {
    console.log('✅ Super Admin - granting access')
    return user
  }
  
  // Step 3: Get role's permissions_json from database
  const supabase = getSupabaseAdminClient()
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('permissions_json')
    .eq('name', user.role)
    .single()
  
  if (roleError || !roleData) {
    console.error('❌ Error fetching role permissions:', roleError)
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Unable to verify permissions.'
      },
      { status: 403 }
    )
  }
  
  // Step 4: Check granular permission
  const permissions = roleData.permissions_json
  const modulePerms = permissions?.[module]
  const itemPerms = modulePerms?.items?.[item]
  
  if (!itemPerms) {
    console.log(`❌ No permissions found for ${module}.${item}`)
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required: ${module}.${item}.${permission}`
      },
      { status: 403 }
    )
  }
  
  // Step 5: Check specific permission or full access
  const hasFullAccess = itemPerms.full === true
  const hasSpecificPermission = itemPerms[permission] === true
  
  if (!hasFullAccess && !hasSpecificPermission) {
    console.log(`❌ Missing permission: ${module}.${item}.${permission} (full: ${itemPerms.full}, ${permission}: ${itemPerms[permission]})`)
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required: ${module}.${item}.${permission}`
      },
      { status: 403 }
    )
  }
  
  console.log(`✅ Permission granted: ${module}.${item}.${permission}`)
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
  }
}
