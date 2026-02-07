export const dynamic = 'force-dynamic'
export const runtime = 'edge'

/**
 * Roles API Route
 * Handles role management operations
 *
 * @route /api/admin/roles
 * @security Requires Admin or Super Admin role
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { buildPermissionCodes } from '@/app/lib/features/auth/permission-mapping'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { createRoleSchema, updateRoleSchema } from '@/app/lib/features/auth/schemas'
import { z } from 'zod'

const toPermissionCodes = (permissions: unknown, permissionsJson: unknown): string[] => {
  if (permissionsJson && typeof permissionsJson === 'object' && !Array.isArray(permissionsJson)) {
    return buildPermissionCodes(permissionsJson as any)
  }

  if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
    return buildPermissionCodes(permissions as any)
  }

  if (Array.isArray(permissions)) {
    return permissions
      .filter((code): code is string => typeof code === 'string')
      .map(code => code.trim())
      .filter(Boolean)
  }

  return []
}

const resolvePermissionIds = async (
  supabase: any,
  permissionCodes: string[]
): Promise<{ permissionData: Array<{ id: string; code: string }>; missingCodes: string[] }> => {
  const uniqueCodes = Array.from(new Set(permissionCodes))
  if (uniqueCodes.length === 0) {
    return { permissionData: [], missingCodes: [] }
  }

  const { data: permissionData, error: permissionQueryError } = await supabase
    .from('permissions')
    .select('id, code')
    .in('code', uniqueCodes)

  if (permissionQueryError) throw permissionQueryError

  const foundCodes = new Set((permissionData ?? []).map((p: any) => p.code))
  const missingCodes = uniqueCodes.filter(code => !foundCodes.has(code))
  return {
    permissionData: permissionData ?? [],
    missingCodes,
  }
}

const syncRolePermissionsIfChanged = async (
  supabase: any,
  roleId: string,
  permissionData: Array<{ id: string; code: string }>
) => {
  const desiredIds = new Set(permissionData.map(p => p.id))

  const { data: existingRows, error: existingError } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId)

  if (existingError) throw existingError

  const existingIds = new Set<string>(
    (existingRows ?? []).map((row: { permission_id: string }) => row.permission_id)
  )
  const isSameSet =
    existingIds.size === desiredIds.size && Array.from(existingIds).every(id => desiredIds.has(id))

  if (isSameSet) {
    return { changed: false }
  }

  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
  if (deleteError) throw deleteError

  if (permissionData.length > 0) {
    const rolePermissionInserts = permissionData.map((permission: any) => ({
      role_id: roleId,
      permission_id: permission.id,
    }))

    const { error: rpError } = await supabase.from('role_permissions').insert(rolePermissionInserts)

    if (rpError) throw rpError
  }

  return { changed: true }
}

/**
 * GET /api/admin/roles
 * Retrieve all roles with their permissions
 *
 * @param request - Next.js request object
 * @returns JSON response with roles, permissions, and permission matrix
 * @security Requires Admin or Super Admin role
 */
export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require roles.manage permission
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult

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
    const { data: rolePermissions, error: rpError } = await supabase.from('role_permissions')
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
      permissions:
        rolePermissions?.filter(rp => rp.role_id === role.id)?.map(rp => rp.permissions) || [],
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          roles,
          permissions,
          permissionMatrix,
          rolePermissions,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch roles',
      },
      { status: 500 }
    )
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
  // ✅ PERMISSION CHECK: Require roles.manage permission
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Validate request body
    const validation = await validateRequestBody(request, createRoleSchema)
    if (!validation.success) return validation.response

    const {
      name,
      description,
      permissions,
      is_manufacturing_role = false,
      permissions_json = {},
    } = validation.data

    const permissionCodes = toPermissionCodes(permissions, permissions_json)
    const { permissionData, missingCodes } = await resolvePermissionIds(supabase, permissionCodes)
    if (missingCodes.length > 0) {
      console.warn(
        `Ignoring unknown permission codes while creating role ${name}: ${missingCodes.join(', ')}`
      )
    }

    // Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        description,
        is_manufacturing_role,
        permissions_json,
      })
      .select()
      .single()

    if (roleError) throw roleError

    // Assign permissions to role
    if (permissionData.length > 0) {
      const rolePermissionInserts = permissionData.map((permission: any) => ({
        role_id: role.id,
        permission_id: permission.id,
      }))

      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(rolePermissionInserts)

      if (rpError) throw rpError
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'role_created',
      meta_json: {
        role_name: name,
        permissions,
        created_by: user.email,
      },
    })

    return NextResponse.json({
      success: true,
      data: { role },
      message: 'Role created successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown permission codes:')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create role',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/roles
 * Update an existing role and its permissions
 *
 * @param request - Next.js request object with updated role data
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function PUT(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require roles.manage permission
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Validate request body
    const validation = await validateRequestBody(
      request,
      updateRoleSchema.extend({ roleId: z.string().uuid() })
    )
    if (!validation.success) return validation.response

    const { roleId, name, description, permissions, permissions_json } = validation.data
    const shouldSyncPermissions = permissions !== undefined || permissions_json !== undefined

    const permissionCodes = shouldSyncPermissions
      ? toPermissionCodes(permissions, permissions_json)
      : []
    const resolvedPermissions = shouldSyncPermissions
      ? await resolvePermissionIds(supabase, permissionCodes)
      : { permissionData: [], missingCodes: [] }
    const permissionData = resolvedPermissions.permissionData
    if (resolvedPermissions.missingCodes.length > 0) {
      console.warn(
        `Ignoring unknown permission codes while updating role ${roleId}: ${resolvedPermissions.missingCodes.join(', ')}`
      )
    }

    // Update role
    const updatePayload: any = { name, description }
    if (permissions_json) updatePayload.permissions_json = permissions_json

    const { error: roleError } = await supabase.from('roles').update(updatePayload).eq('id', roleId)

    if (roleError) throw roleError

    // Update permissions when explicitly provided.
    if (shouldSyncPermissions) {
      await syncRolePermissionsIfChanged(supabase, roleId, permissionData)
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'role_updated',
      meta_json: {
        role_id: roleId,
        permissions,
        updated_by: user.email,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      },
      { status: 500 }
    )
  }
}
