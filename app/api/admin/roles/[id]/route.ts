export const dynamic = 'force-dynamic'

/**
 * Role Detail API Route
 * Handles operations for individual roles
 *
 * @route /api/admin/roles/[id]
 * @security Requires Admin or Super Admin role
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { buildPermissionCodes } from '@/app/lib/features/auth/permission-mapping'

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
    const rolePermissionInserts = permissionData.map(p => ({
      role_id: roleId,
      permission_id: p.id,
    }))
    const { error: rpError } = await supabase.from('role_permissions').insert(rolePermissionInserts)
    if (rpError) throw rpError
  }

  return { changed: true }
}

/**
 * GET /api/admin/roles/[id]
 * Retrieve a single role by ID
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing role ID
 * @returns JSON response with role data
 * @security Requires Admin or Super Admin role
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Check authentication
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id

    // Get role from database
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError) {
      throw roleError
    }

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found',
        },
        { status: 404 }
      )
    }

    const { data: rolePermissions, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select(
        `
          permission_id,
          permissions (code)
        `
      )
      .eq('role_id', roleId)

    if (rolePermissionsError) {
      throw rolePermissionsError
    }

    const effectivePermissionCodes = Array.from(
      new Set(
        (rolePermissions ?? [])
          .map((row: any) =>
            Array.isArray(row.permissions) ? row.permissions?.[0]?.code : row.permissions?.code
          )
          .filter((code: unknown): code is string => typeof code === 'string' && code.length > 0)
      )
    )

    return NextResponse.json({
      success: true,
      data: role,
      effective_permission_codes: effectivePermissionCodes,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/roles/[id]
 * Update a single role by ID
 *
 * @param request - Next.js request object with updated role data
 * @param params - Route parameters containing role ID
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // Check authentication - Allow Admin and Super Admin
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id
    const body = await request.json()

    const { name, description, is_manufacturing_role, permissions, permissions_json } = body

    // Prepare update data - only include fields that exist in the table
    const updateData: any = {
      name,
      description,
      updated_at: new Date().toISOString(),
    }

    // Add optional fields if they exist in the request
    if (is_manufacturing_role !== undefined) {
      updateData.is_manufacturing_role = is_manufacturing_role
    }

    // Fix: Prioritize permissions_json (granular) over permissions (legacy array)
    if (permissions_json) {
      updateData.permissions_json = permissions_json
    } else if (permissions && !Array.isArray(permissions)) {
      // Legacy fallback: If permissions is passed as an object (old behavior), treat as json
      updateData.permissions_json = permissions
    }

    // Update the role
    const { error: updateError } = await supabase.from('roles').update(updateData).eq('id', roleId)

    if (updateError) {
      console.error('❌ Update error:', updateError)
      throw updateError
    }

    // TASK 4: Sync role_permissions table with permissions_json
    const shouldSyncPermissions = permissions !== undefined || permissions_json !== undefined

    if (shouldSyncPermissions) {
      const permissionCodes = toPermissionCodes(permissions, permissions_json)
      const { permissionData, missingCodes } = await resolvePermissionIds(supabase, permissionCodes)
      if (missingCodes.length > 0) {
        console.warn(
          `Ignoring unknown permission codes for role ${roleId}: ${missingCodes.join(', ')}`
        )
      }
      await syncRolePermissionsIfChanged(supabase, roleId, permissionData)
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'role_updated',
      meta_json: {
        role_id: roleId,
        role_name: name,
        updated_fields: {
          name,
          description,
          is_manufacturing_role,
          permissions: permissions ? 'updated' : 'not changed',
        },
        updated_by: user.email,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role "${name}" updated successfully`,
    })
  } catch (error: any) {
    console.error('❌ PUT /api/admin/roles/[id] error:', error)

    // Return detailed error information
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update role',
        details: error?.details || error?.hint || null,
        code: error?.code || null,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete a role by ID
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing role ID
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Check authentication (only Super Admin can delete roles)
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id

    // Delete the role
    const { error: deleteError } = await supabase.from('roles').delete().eq('id', roleId)

    if (deleteError) {
      throw deleteError
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      actor_id: user.id, // ✅ FIXED: Get from authenticated user
      action: 'role_deleted',
      meta_json: {
        role_id: roleId,
        deleted_by: user.email,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete role',
      },
      { status: 500 }
    )
  }
}
