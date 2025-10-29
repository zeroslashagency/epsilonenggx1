export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { createUserSchema } from '@/app/lib/validation/schemas'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, createUserSchema)
    if (!validation.success) return validation.response
    
    const { email, password, roleId, customPermissions } = validation.data

    if (!email || !password || !roleId) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create profile explicitly
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: validation.data.full_name || email.split('@')[0],
        role: 'Operator',
        role_badge: 'Operator'
      })

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Assign role to user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role_id: roleId
      })

    if (roleError) {
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    // If custom permissions are provided, add them
    if (customPermissions && customPermissions.length > 0) {
      const permissionInserts = customPermissions.map((permissionId: string) => ({
        user_id: authUser.user.id,
        permission_id: permissionId,
        effect: 'grant'
      }))

      const { error: permError } = await supabase
        .from('user_permissions')
        .insert(permissionInserts)

      if (permError) {
        // Note: We don't fail the entire operation for permission errors
      }
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'create_user',
        meta_json: {
          created_user_email: email,
          role_id: roleId,
          custom_permissions: customPermissions || []
        }
      })

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
