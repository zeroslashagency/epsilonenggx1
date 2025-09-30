import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

// Use anon key with updated RLS policies that allow authenticated access
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    console.log('Starting user-permissions API call...')
    
    // Get all users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, role_badge, created_at, updated_at')
      .order('created_at', { ascending: false })

    console.log('Profiles query result:', { profiles: profiles?.length, error: profilesError })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: `Failed to fetch users: ${profilesError.message}` }, { status: 500 })
    }

    // Get user roles with a simpler query
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id')

    console.log('User roles query result:', { userRoles: userRoles?.length, error: userRolesError })

    if (userRolesError) {
      console.error('Error fetching user roles:', userRolesError)
      return NextResponse.json({ error: `Failed to fetch user roles: ${userRolesError.message}` }, { status: 500 })
    }

    // Get all roles separately
    const { data: allRoles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name')

    console.log('Roles query result:', { allRoles: allRoles?.length, error: rolesError })

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return NextResponse.json({ error: `Failed to fetch roles: ${rolesError.message}` }, { status: 500 })
    }

    // Get role permissions
    const { data: rolePermissions, error: permError } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id')

    console.log('Role permissions query result:', { rolePermissions: rolePermissions?.length, error: permError })

    // Get all permissions
    const { data: allPermissions, error: allPermError } = await supabase
      .from('permissions')
      .select('id, code, description')
    console.log('Permissions query result:', { allPermissions: allPermissions?.length, error: allPermError })

    // Get custom user permissions
    const { data: customUserPermissions, error: customPermError } = await supabase
      .from('user_permissions')
      .select('user_id, permission_id, effect')

    console.log('Custom user permissions query result:', { customUserPermissions: customUserPermissions?.length, error: customPermError })

    // Combine the data
    const usersWithPermissions = profiles?.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id)
      const role = allRoles?.find(r => r.id === userRole?.role_id)
      
      // Get permissions for this user's role
      const rolePermissionIds = rolePermissions?.filter(rp => rp.role_id === userRole?.role_id).map(rp => rp.permission_id) || []
      
      // Get custom permissions for this user
      const userCustomPermissions = customUserPermissions?.filter(up => up.user_id === profile.id) || []
      const grantedCustomPermissions = userCustomPermissions.filter(up => up.effect === 'grant').map(up => up.permission_id)
      const revokedCustomPermissions = userCustomPermissions.filter(up => up.effect === 'revoke').map(up => up.permission_id)
      
      // FIXED LOGIC: If user has ANY custom permissions, ignore role permissions completely
      let finalPermissionIds: string[] = []
      
      const hasCustomPermissions = grantedCustomPermissions.length > 0 || revokedCustomPermissions.length > 0
      
      if (hasCustomPermissions) {
        // User has custom permissions - use ONLY custom permissions (ignore role)
        finalPermissionIds = [...grantedCustomPermissions]
        // Note: revoked permissions are simply not included (they're excluded by not being in granted)
      } else {
        // User has no custom permissions - use role permissions as default
        finalPermissionIds = [...rolePermissionIds]
      }
      
      const userPermissions = allPermissions?.filter(p => finalPermissionIds.includes(p.id)) || []
      
      if (profile.email === 'main@gmail.com') {
        console.log(`🔍 DEBUGGING main@gmail.com permissions:`, {
          rolePermissionIds: rolePermissionIds.length,
          grantedCustomPermissions: grantedCustomPermissions.length,
          revokedCustomPermissions: revokedCustomPermissions.length,
          totalPermissions: userPermissions.length,
          rolePermissions: rolePermissionIds,
          revokedPermissions: revokedCustomPermissions,
          finalPermissions: finalPermissionIds,
          userPermissionCodes: userPermissions.map(p => p.code)
        })
      }
      
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

    console.log('API Response - Total users:', usersWithPermissions.length)
    console.log('API Response - Users:', usersWithPermissions.map(u => ({ email: u.email, role: u.role?.name })))

    return NextResponse.json({
      users: usersWithPermissions,
      availableRoles: allRoles,
      availablePermissions: allPermissions
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
