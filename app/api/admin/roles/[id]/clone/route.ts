export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

/**
 * POST /api/admin/roles/[id]/clone
 * Clone a role with all its permissions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const sourceRoleId = params.id



    // Get source role
    const { data: sourceRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', sourceRoleId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching source role:', fetchError)
      throw fetchError
    }



    // Generate new name
    let newName = `${sourceRole.name} (Copy)`
    let counter = 1

    // Check if name exists, increment counter if needed
    while (true) {
      const { data: existing } = await supabase
        .from('roles')
        .select('id')
        .eq('name', newName)
        .single()

      if (!existing) break

      counter++
      newName = `${sourceRole.name} (Copy ${counter})`
    }



    // Create cloned role
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        name: newName,
        description: sourceRole.description,
        is_manufacturing_role: sourceRole.is_manufacturing_role,
        permissions_json: sourceRole.permissions_json
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating role:', createError)
      throw createError
    }



    // Clone role_permissions if they exist
    const { data: sourcePermissions } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', sourceRoleId)

    if (sourcePermissions && sourcePermissions.length > 0) {

      const permissionInserts = sourcePermissions.map(sp => ({
        role_id: newRole.id,
        permission_id: sp.permission_id
      }))

      const { error: rpError } = await supabase
        .from('role_permissions')
        .insert(permissionInserts)

      if (rpError) {
        console.error('⚠️ Error cloning role_permissions:', rpError)
      }
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'role_cloned',
        meta_json: {
          source_role_id: sourceRoleId,
          source_role_name: sourceRole.name,
          new_role_id: newRole.id,
          new_role_name: newName,
          cloned_by: user.email
        }
      })

    return NextResponse.json({
      success: true,
      data: newRole,
      message: `Role cloned as "${newName}"`
    })

  } catch (error) {
    console.error('❌ Clone error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clone role'
    }, { status: 500 })
  }
}
