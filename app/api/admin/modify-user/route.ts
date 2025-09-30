import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

// Use anon key with updated RLS policies that allow authenticated access
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function PUT(request: Request) {
  try {
    const { userId, roleId, customPermissions, removePermissions, actorId } = await request.json()
    
    console.log('Modify user request:', { userId, roleId, customPermissions, removePermissions })

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update user role if provided
    if (roleId) {
      console.log('Updating role for user:', userId, 'to role:', roleId)
      
      // Delete existing role assignment
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error deleting existing role:', deleteError)
      }

      // Insert new role assignment
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId
        })

      if (roleError) {
        console.error('Error updating user role:', roleError)
        return NextResponse.json({ error: `Failed to update user role: ${roleError.message}` }, { status: 500 })
      }
      
      console.log('Role updated successfully')
      
      // Get the new role name for audit log
      const { data: newRoleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single()
      
      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          target_id: userId,
          actor_id: actorId || null,
          action: 'role_change',
          meta_json: {
            new_role: newRoleData?.name || 'unknown',
            description: `Role changed to ${newRoleData?.name || 'unknown'} by admin`
          },
          ip: '127.0.0.1' // TODO: Get real IP from request
        })
    }

    // Handle permission changes (both grants and revokes)
    // FIXED: Always process permissions when customPermissions is provided (even if empty array)
    if (customPermissions !== undefined || (removePermissions && removePermissions.length > 0)) {
      // First, remove all existing custom permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)

      // Get user's role permissions to determine what should be the baseline
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .single()

      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', userRole?.role_id)

      const rolePermissionIds = rolePermissions?.map(rp => rp.permission_id) || []

      // Create the final set of permissions this user should have
      const grantedPermissionIds = customPermissions || []
      const explicitRevokedPermissionIds = removePermissions || []

      // FIXED LOGIC: Handle custom permissions properly
      const permissionChanges = []
      
      // Case 1: Specific permissions granted (some checkboxes checked)
      if (grantedPermissionIds.length > 0) {
        // Grant the specified permissions
        permissionChanges.push(
          ...grantedPermissionIds.map((permissionId: string) => ({
            user_id: userId,
            permission_id: permissionId,
            effect: 'grant'
          }))
        )
        
        // Auto-revoke all role permissions that weren't explicitly granted
        const rolePermissionsToRevoke = rolePermissionIds.filter(
          (rolePermId: string) => !grantedPermissionIds.includes(rolePermId)
        )
        
        permissionChanges.push(
          ...rolePermissionsToRevoke.map((permissionId: string) => ({
            user_id: userId,
            permission_id: permissionId,
            effect: 'revoke'
          }))
        )
      } else {
        // Case 2: NO permissions granted (all checkboxes unchecked)
        // Create a special marker to indicate this user has been customized to have no permissions
        console.log('REVOKING ALL PERMISSIONS - User unchecked everything')
        
        // Create a special "customized" marker using a dummy permission
        // This tells the system that this user has been explicitly customized
        const { data: markerPermission } = await supabase
          .from('permissions')
          .select('id')
          .eq('code', 'view_dashboard')
          .single()
          
        if (markerPermission) {
          permissionChanges.push({
            user_id: userId,
            permission_id: markerPermission.id,
            effect: 'revoke'  // Revoke dashboard as a marker that user is customized
          })
        }
      }
      
      // Add explicitly revoked permissions
      if (explicitRevokedPermissionIds.length > 0) {
        permissionChanges.push(
          ...explicitRevokedPermissionIds.map((permissionId: string) => ({
            user_id: userId,
            permission_id: permissionId,
            effect: 'revoke'
          }))
        )
      }

      // Insert all permission changes
      if (permissionChanges.length > 0) {
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissionChanges)

        if (permError) {
          console.error('Error updating permissions:', permError)
          return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
        }
      }

      // Create audit logs
      if (grantedPermissionIds.length > 0) {
        const { data: grantedPermissions } = await supabase
          .from('permissions')
          .select('code, description')
          .in('id', grantedPermissionIds)
        
        for (const permission of grantedPermissions || []) {
          await supabase
            .from('audit_logs')
            .insert({
              target_id: userId,
              actor_id: actorId || null,
              action: 'permission_grant',
              meta_json: {
                permission: permission.code,
                description: `Permission granted: ${permission.description}`
              },
              ip: '127.0.0.1'
            })
        }
      }

      if (explicitRevokedPermissionIds.length > 0) {
        const { data: revokedPermissions } = await supabase
          .from('permissions')
          .select('code, description')
          .in('id', explicitRevokedPermissionIds)
        
        for (const permission of revokedPermissions || []) {
          await supabase
            .from('audit_logs')
            .insert({
              target_id: userId,
              actor_id: actorId || null,
              action: 'permission_revoke',
              meta_json: {
                permission: permission.code,
                description: `Permission revoked: ${permission.description}`
              },
              ip: '127.0.0.1'
            })
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
