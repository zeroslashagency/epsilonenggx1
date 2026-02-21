export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { createUserSchema } from '@/app/lib/features/auth/schemas'
import { checkRateLimit, strictRateLimit } from '@/app/lib/middleware/rate-limit.middleware'
import { requireCSRFToken } from '@/app/lib/middleware/csrf-protection'

export async function POST(request: NextRequest) {
  // ✅ SECURITY FIX: Check CSRF token first
  const csrfResult = await requireCSRFToken(request)
  if (csrfResult) return csrfResult

  // Check rate limit (10 per minute to prevent mass user creation)
  const rateLimitResult = await checkRateLimit(request, strictRateLimit)
  if (!rateLimitResult.success) return rateLimitResult.response

  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, createUserSchema)
    if (!validation.success) return validation.response
    
    const { email, password, roleId, role, customPermissions } = validation.data

    if (!email || !password || (!roleId && !role)) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    let selectedRole: { id: string; name: string } | null = null
    if (roleId) {
      const { data: roleById, error: roleByIdError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('id', roleId)
        .single()

      if (roleByIdError || !roleById) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 })
      }
      selectedRole = roleById
    } else if (role) {
      const { data: roleByName, error: roleByNameError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', role)
        .single()

      if (roleByNameError || !roleByName) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 })
      }
      selectedRole = roleByName
    }

    if (!selectedRole) {
      return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 })
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
        role: selectedRole.name,
        role_badge: selectedRole.name
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
        role_id: selectedRole.id
      })

    if (roleError) {
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    // If custom permissions are provided, add them
    if (Array.isArray(customPermissions) && customPermissions.length > 0) {
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

    // ✅ Log the action with complete audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: authUser.user.id,
        action: 'user_created',
        meta_json: {
          created_user: {
            email: email,
            full_name: validation.data.full_name || email.split('@')[0],
            role_id: selectedRole.id,
            role_name: selectedRole.name
          },
          created_by: user.email,
          created_at: new Date().toISOString(),
          creation_method: 'manual_entry',
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
