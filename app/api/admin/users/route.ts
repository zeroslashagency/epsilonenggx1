export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '../../../lib/services/supabase-client'
import { userListLimiter } from '../../../lib/rate-limiter'
import { requirePermission } from '../../../lib/middleware/auth.middleware'

// Admin API for user management - FIXED VERSION
export async function GET(request: NextRequest) {
  try {
    // RATE LIMITING: Check if user is making too many requests
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `user-list:${clientIP}`
    
    const rateLimitResult = await userListLimiter.check(rateLimitKey)
    
    if (!rateLimitResult.success) {
      console.warn('🚨 Rate limit exceeded for user list:', { 
        ip: clientIP, 
        limit: rateLimitResult.limit
      })
      
      return NextResponse.json({
        error: 'Too many user list requests. Please try again later.',
        rateLimitInfo: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.reset
        }
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      })
    }

    const supabase = getSupabaseAdminClient()
    
    // Get all users from auth.users (the real authenticated users)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) throw authError

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) throw profilesError

    // Create a map of profiles by user ID for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Combine auth users with their profiles
    const users = authUsers.users
      .filter(authUser => !authUser.email?.startsWith('deleted_'))
      .map(authUser => {
        const profile = profileMap.get(authUser.id)
        return {
          id: authUser.id,
          email: authUser.email || '',
          full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || '',
          role: profile?.role || 'Operator',
          role_badge: profile?.role_badge || 'Operator',
          employee_code: profile?.employee_code || null,
          department: profile?.department || null,
          designation: profile?.designation || null,
          phone: profile?.phone || null,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || profile?.updated_at,
          standalone_attendance: profile?.standalone_attendance || 'NO'
        }
      })

    // Get roles and permissions for each user
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles (
          id,
          name,
          description
        )
      `)

    if (rolesError) throw rolesError

    // Combine user data with roles
    const enhancedUsers = users?.map((user: any) => ({
      ...user,
      roles: userRoles?.filter((ur: any) => ur.user_id === user.id) || [],
      status: 'active' // You can add status logic here
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: enhancedUsers,
        totalCount: users?.length || 0
      }
    })

  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

// Create new user
export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const {
      email,
      password,
      full_name,
      role = 'operator',
      roles = [],
      scope = {}
    } = body

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        role,
        role_badge: role.charAt(0).toUpperCase() + role.slice(1)
      })

    if (profileError) throw profileError

    // Assign roles if provided
    if (roles.length > 0) {
      const { data: roleData, error: roleQueryError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roles)

      if (roleQueryError) throw roleQueryError

      const userRoleInserts = roleData.map((role: any) => ({
        user_id: authUser.user.id,
        role_id: role.id,
        scope_json: scope
      }))

      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert(userRoleInserts)

      if (userRoleError) throw userRoleError
    }

    // Log audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: null, // You can get this from JWT
        target_id: authUser.user.id,
        action: 'user_created',
        meta_json: {
          email,
          role,
          roles,
          created_by: 'admin_panel'
        }
      })

    if (auditError) console.warn('Audit log failed:', auditError)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authUser.user.id,
          email,
          full_name,
          role,
          roles
        }
      },
      message: 'User created successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    }, { status: 500 })
  }
}

// Update user
export async function PATCH(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const {
      userId,
      email,
      full_name,
      role,
      roles = [],
      scope = {},
      status
    } = body

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email,
        full_name,
        role,
        role_badge: role?.charAt(0).toUpperCase() + role?.slice(1),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) throw profileError

    // Update user roles
    if (roles.length > 0) {
      // Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Get role IDs
      const { data: roleData, error: roleQueryError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roles)

      if (roleQueryError) throw roleQueryError

      // Insert new roles
      const userRoleInserts = roleData.map((role: any) => ({
        user_id: userId,
        role_id: role.id,
        scope_json: scope
      }))

      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert(userRoleInserts)

      if (userRoleError) throw userRoleError
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: null, // Get from JWT
        target_id: userId,
        action: 'user_updated',
        meta_json: {
          changes: { email, full_name, role, roles, status },
          updated_by: 'admin_panel'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user'
    }, { status: 500 })
  }
}

// Delete/deactivate user
export async function DELETE(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Soft delete - update status instead of hard delete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'deactivated',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) throw profileError

    // Remove user roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (rolesError) throw rolesError

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: null, // Get from JWT
        target_id: userId,
        action: 'user_deactivated',
        meta_json: {
          deactivated_by: 'admin_panel'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user'
    }, { status: 500 })
  }
}
