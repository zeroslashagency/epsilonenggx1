export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function PUT(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.edit permission
  const authResult = await requirePermission(request, 'users.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    const { userId, roleId, customPermissions, removePermissions, actorId } = await request.json()
    

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update user role if provided
    if (roleId) {
      
      // Delete existing role assignment
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
      }

      // Insert new role assignment
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId
        })

      if (roleError) {
        return NextResponse.json({ error: `Failed to update user role: ${roleError.message}` }, { status: 500 })
      }
      
      
      // Get the new role name for audit log
      const { data: newRoleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single()
      
      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          target_id: userId,
          actor_id: actorId || user.id, // ✅ FIXED: Use authenticated user if actorId not provided
          action: 'role_change',
          meta_json: {
            new_role: newRoleData?.name || 'unknown',
            description: `Role changed to ${newRoleData?.name || 'unknown'} by ${user.email}`,
            changed_by: user.email
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown' // ✅ FIXED: Get real IP
        })
      
      if (auditError) {
        // Don't fail the request, just log the error
      }
    }

    // Pure RBAC: Permissions are managed through role assignment only
    // Custom permissions (customPermissions, removePermissions) are ignored
    // Users get permissions based on their assigned role
    
    // Log if custom permissions were attempted (for migration awareness)
    if (customPermissions !== undefined || (removePermissions && removePermissions.length > 0)) {
      
      // Create audit log for attempted custom permission change
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: userId,
          action: 'attempted_custom_permission_change',
          meta_json: {
            note: 'Custom permissions not supported in Pure RBAC mode',
            attempted_grants: customPermissions?.length || 0,
            attempted_revokes: removePermissions?.length || 0
          }
        })
      
      if (auditError) {
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
