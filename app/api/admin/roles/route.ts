export const dynamic = 'force-dynamic'

/**
 * Roles API Route
 * Handles role management operations
 * 
 * @route /api/admin/roles
 * @security Requires Admin or Super Admin role
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'
import { successResponse, serverErrorResponse } from '@/app/lib/utils/api-response'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { createRoleSchema, updateRoleSchema } from '@/app/lib/validation/schemas'
import { z } from 'zod'

/**
 * GET /api/admin/roles
 * Retrieve all roles with their permissions
 * 
 * @param request - Next.js request object
 * @returns JSON response with roles, permissions, and permission matrix
 * @security Requires Admin or Super Admin role
 */
export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require assign_roles permission
  const authResult = await requirePermission(request, 'assign_roles')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles'
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/roles
 * Create a new role with permissions
 * 
 * @param request - Next.js request object with role data
 * @returns JSON response with created role
 * @security Requires Super Admin role
 */
export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require assign_roles permission
  const authResult = await requirePermission(request, 'assign_roles')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, createRoleSchema)
    if (!validation.success) return validation.response
    
    const { name, description, permissions = [], is_manufacturing_role = false, permissions_json = {} } = validation.data

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        description,
        is_manufacturing_role,
        permissions_json
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

      const rolePermissionInserts = permissionData.map((permission: any) => ({
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
        actor_id: user.id,
        action: 'role_created',
        meta_json: {
          role_name: name,
          permissions,
          created_by: user.email
        }
      })

    return NextResponse.json({
      success: true,
      data: { role },
      message: 'Role created successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/roles
 * Update an existing role and its permissions
 * 
 * @param request - Next.js request object with updated role data
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function PATCH(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require assign_roles permission
  const authResult = await requirePermission(request, 'assign_roles')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, updateRoleSchema.extend({ roleId: z.string().uuid() }))
    if (!validation.success) return validation.response
    
    const { roleId, name, description, permissions = [] } = validation.data

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

      const rolePermissionInserts = permissionData.map((permission: any) => ({
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
        actor_id: user.id,
        action: 'role_updated',
        meta_json: {
          role_id: roleId,
          permissions,
          updated_by: user.email
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role'
    }, { status: 500 })
  }
}
