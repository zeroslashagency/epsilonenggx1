import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

// Get all roles and permissions
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (rolesError) throw rolesError

    // Get all permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('*')
      .order('code')

    if (permissionsError) throw permissionsError

    // Get role-permission mappings
    const { data: rolePermissions, error: rpError } = await supabase
      .from('role_permissions')
      .select(`
        role_id,
        permission_id,
        roles (name),
        permissions (code, description)
      `)

    if (rpError) throw rpError

    // Build permission matrix
    const permissionMatrix = roles?.map(role => ({
      ...role,
      permissions: rolePermissions
        ?.filter(rp => rp.role_id === role.id)
        ?.map(rp => rp.permissions) || []
    }))

    return NextResponse.json({
      success: true,
      data: {
        roles,
        permissions,
        permissionMatrix,
        rolePermissions
      }
    })

  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles'
    }, { status: 500 })
  }
}

// Create new role
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    
    const { name, description, permissions = [] } = body

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        description
      })
      .select()
      .single()

    if (roleError) throw roleError

    // Assign permissions to role
    if (permissions.length > 0) {
      const { data: permissionData, error: permissionQueryError } = await supabase
        .from('permissions')
        .select('id')
        .in('code', permissions)

      if (permissionQueryError) throw permissionQueryError

      const rolePermissionInserts = permissionData.map(permission => ({
        role_id: role.id,
        permission_id: permission.id
      }))

      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(rolePermissionInserts)

      if (rpError) throw rpError
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: null, // Get from JWT
        action: 'role_created',
        meta_json: {
          role_name: name,
          permissions,
          created_by: 'admin_panel'
        }
      })

    return NextResponse.json({
      success: true,
      data: { role },
      message: 'Role created successfully'
    })

  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role'
    }, { status: 500 })
  }
}

// Update role permissions
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    
    const { roleId, name, description, permissions = [] } = body

    // Update role
    const { error: roleError } = await supabase
      .from('roles')
      .update({
        name,
        description
      })
      .eq('id', roleId)

    if (roleError) throw roleError

    // Update permissions
    // Delete existing permissions
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Add new permissions
    if (permissions.length > 0) {
      const { data: permissionData, error: permissionQueryError } = await supabase
        .from('permissions')
        .select('id')
        .in('code', permissions)

      if (permissionQueryError) throw permissionQueryError

      const rolePermissionInserts = permissionData.map(permission => ({
        role_id: roleId,
        permission_id: permission.id
      }))

      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(rolePermissionInserts)

      if (rpError) throw rpError
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: null, // Get from JWT
        action: 'role_updated',
        meta_json: {
          role_id: roleId,
          permissions,
          updated_by: 'admin_panel'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully'
    })

  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role'
    }, { status: 500 })
  }
}
