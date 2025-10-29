export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

// Get role profiles with their default permissions
export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require roles.view permission
  const authResult = await requirePermission(request, 'roles.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all roles with their permissions
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        description,
        default_permissions,
        role_permissions (
          permission_id,
          permissions (
            code,
            description
          )
        )
      `)
      .order('name')

    if (rolesError) throw rolesError

    // Transform data into role profiles format
    const roleProfiles: Record<string, string[]> = {}
    
    roles?.forEach((role: any) => {
      // Use default_permissions if available, otherwise fall back to role_permissions
      if (role.default_permissions && Array.isArray(role.default_permissions)) {
        roleProfiles[role.name] = role.default_permissions
      } else {
        // Extract permission codes from role_permissions
        const permissionCodes = role.role_permissions
          ?.map((rp: any) => rp.permissions?.code)
          .filter(Boolean) || []
        roleProfiles[role.name] = permissionCodes
      }
    })

    return NextResponse.json({
      success: true,
      data: roleProfiles
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role profiles'
    }, { status: 500 })
  }
}

// Update role profiles with new default permissions
export async function PUT(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require assign_roles permission
  const authResult = await requirePermission(request, 'assign_roles')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    // Handle single role update (from edit page)
    if (body.roleId) {
      const { roleId, name, description, is_manufacturing_role, permissions, updated_at } = body

      // Update the role
      const { error: updateError } = await supabase
        .from('roles')
        .update({
          name,
          description,
          is_manufacturing_role,
          permissions_json: permissions,
          updated_at: updated_at || new Date().toISOString()
        })
        .eq('id', roleId)

      if (updateError) throw updateError

      // Log audit trail
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: user.id, // ✅ FIXED: Get from authenticated user
          action: 'role_updated',
          meta_json: {
            role_id: roleId,
            role_name: name,
            updated_fields: {
              name,
              description,
              is_manufacturing_role,
              permissions
            },
            updated_by: user.email,
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          }
        })

      return NextResponse.json({
        success: true,
        message: `Role "${name}" updated successfully`
      })
    }
    
    // Handle bulk role updates (legacy format)
    const { roles } = body
    
    if (!Array.isArray(roles)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format. Expected roles array or roleId.'
      }, { status: 400 })
    }

    // Validate each role update
    for (const roleUpdate of roles) {
      if (!roleUpdate.roleKey || !Array.isArray(roleUpdate.permissions)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid role update format. Each role must have roleKey and permissions array.'
        }, { status: 400 })
      }
    }

    // Process each role update
    const updatePromises = roles.map(async (roleUpdate: any) => {
      const { roleKey, permissions } = roleUpdate

      // First, check if role exists
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', roleKey)
        .single()

      if (roleCheckError || !existingRole) {
        throw new Error(`Role '${roleKey}' not found`)
      }

      // Update the role's default_permissions
      const { error: updateError } = await supabase
        .from('roles')
        .update({
          default_permissions: permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRole.id)

      if (updateError) throw updateError

      // Log audit trail
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: user.id, 
          action: 'role_profile_updated',
          meta_json: {
            role_name: roleKey,
            role_id: existingRole.id,
            new_permissions: permissions,
            updated_by: user.email,
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          }
        })

      return { roleKey, success: true }
    })

    const results = await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully updated ${results.length} role profile(s)`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role profiles'
    }, { status: 500 })
  }
}

// Create a new role with default permissions
export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require assign_roles permission
  const authResult = await requirePermission(request, 'assign_roles')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { name, description, permissions = [] } = body

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Role name is required'
      }, { status: 400 })
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)
      .single()

    if (existingRole) {
      return NextResponse.json({
        success: false,
        error: 'Role with this name already exists'
      }, { status: 409 })
    }

    // Create the new role
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        name,
        description: description || `Custom role: ${name}`,
        default_permissions: permissions
      })
      .select()
      .single()

    if (createError) throw createError

    // If permissions are provided, also create role_permissions entries
    if (permissions.length > 0) {
      // Get permission IDs for the provided codes
      const { data: permissionData, error: permissionError } = await supabase
        .from('permissions')
        .select('id, code')
        .in('code', permissions)

      if (permissionError) throw permissionError

      // Create role_permissions entries
      const rolePermissionInserts = permissionData.map((permission: any) => ({
        role_id: newRole.id,
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
        actor_id: user.id, 
        action: 'role_created',
        meta_json: {
          role_name: name,
          role_id: newRole.id,
          permissions,
          created_by: user.email,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role'
    }, { status: 500 })
  }
}
