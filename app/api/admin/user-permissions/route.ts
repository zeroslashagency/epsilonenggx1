export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.permissions permission
  const authResult = await requirePermission(request, 'users.permissions')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, role_badge, created_at, updated_at')
      .order('created_at', { ascending: false })


    if (profilesError) {
      return NextResponse.json({ error: `Failed to fetch users: ${profilesError.message}` }, { status: 500 })
    }

    // Get user roles with a simpler query
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id')


    if (userRolesError) {
      return NextResponse.json({ error: `Failed to fetch user roles: ${userRolesError.message}` }, { status: 500 })
    }

    // Get all roles separately
    const { data: allRoles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name')


    if (rolesError) {
      return NextResponse.json({ error: `Failed to fetch roles: ${rolesError.message}` }, { status: 500 })
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id')


    // Get all permissions
    const { data: allPermissions, error: allPermError } = await supabase
      .from('permissions')
      .select('id, code, description')

    // Combine the data - Pure RBAC (no custom user permissions)
    const usersWithPermissions = profiles?.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id)
      const role = allRoles?.find(r => r.id === userRole?.role_id)
      
      // Get permissions for this user's role (RBAC only)
      const rolePermissionIds = rolePermissions?.filter(rp => rp.role_id === userRole?.role_id).map(rp => rp.permission_id) || []
      
      // Get user permissions from their role
      const userPermissions = allPermissions?.filter(p => rolePermissionIds.includes(p.id)) || []
      
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        role: role || { 
          id: null,
          name: profile.role_badge || profile.role || 'no_role', 
          description: profile.role || 'No role assigned' 
        },
        permissions: userPermissions
      }
    }) || []


    return NextResponse.json({
      users: usersWithPermissions,
      availableRoles: allRoles,
      availablePermissions: allPermissions
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
