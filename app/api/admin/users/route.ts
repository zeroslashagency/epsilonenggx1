import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/services/supabase-client'

// Admin API for user management - FIXED VERSION
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Get all users with their roles and permissions
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        role_badge,
        employee_code,
        department,
        designation,
        phone,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (usersError) throw usersError

    // Get roles and permissions for each user
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles (
          id,
          name,
          description
        ),
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
    console.error('Error fetching users:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    }, { status: 500 })
  }
}

// Create new user
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
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
    console.error('Error creating user:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    }, { status: 500 })
  }
}

// Update user
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
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
    console.error('Error updating user:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user'
    }, { status: 500 })
  }
}

// Delete/deactivate user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
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
    console.error('Error deactivating user:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user'
    }, { status: 500 })
  }
}
