export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { updateUserPermissionsSchema } from '@/app/lib/features/auth/schemas'
import { permissionUpdateLimiter } from '@/app/lib/rate-limiter'
import { invalidateUserSessions } from '@/app/lib/services/session-cache'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RoleInputObject = {
  id?: string
  name?: string
  value?: string
  label?: string
  [key: string]: unknown
}

function isRoleInputObject(value: unknown): value is RoleInputObject {
  return typeof value === 'object' && value !== null
}

function normalizeRoleInput(role: unknown): { roleId?: string; roleName?: string } {
  if (typeof role === 'string') {
    const trimmed = role.trim()
    if (!trimmed) return {}
    return UUID_REGEX.test(trimmed) ? { roleId: trimmed } : { roleName: trimmed }
  }

  if (!isRoleInputObject(role)) {
    return {}
  }

  const id = typeof role.id === 'string' && role.id.trim() ? role.id.trim() : undefined
  const nameCandidates = [role.name, role.value, role.label]
  const roleName = nameCandidates.find(
    candidate => typeof candidate === 'string' && candidate.trim()
  ) as string | undefined

  return {
    roleId: id,
    roleName: roleName?.trim(),
  }
}

function normalizeStandaloneAttendance(value: unknown): 'YES' | 'NO' {
  if (value === true) return 'YES'
  if (value === false) return 'NO'
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase()
    if (normalized === 'YES' || normalized === 'TRUE') return 'YES'
  }
  return 'NO'
}

function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (permission): permission is string =>
        typeof permission === 'string' && permission.trim().length > 0
    )
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([, permissionValue]) => permissionValue === true)
      .map(([permissionCode]) => permissionCode)
  }

  return []
}

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.permissions permission
  const authResult = await requirePermission(request, 'users.permissions')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Validate request body
    const validation = await validateRequestBody(request, updateUserPermissionsSchema)
    if (!validation.success) return validation.response

    const { userId, role, permissions, standalone_attendance } = validation.data
    const normalizedUserId = userId.trim()
    const normalizedRole = normalizeRoleInput(role)
    const normalizedStandaloneAttendance = normalizeStandaloneAttendance(standalone_attendance)
    const normalizedPermissions = normalizePermissions(permissions)

    if (!normalizedUserId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
        },
        { status: 400 }
      )
    }

    // RATE LIMITING: Check if user is making too many requests
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `permission-update:${clientIP}`

    const rateLimitResult = await permissionUpdateLimiter.check(rateLimitKey)

    if (!rateLimitResult.success) {
      console.warn('🚨 Rate limit exceeded:', {
        ip: clientIP,
        limit: rateLimitResult.limit,
        reset: new Date(rateLimitResult.reset).toISOString(),
      })

      return NextResponse.json(
        {
          error: 'Too many permission update requests. Please try again later.',
          rateLimitInfo: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.reset,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // SECURITY: Prevent self-modification
    if (user.id === normalizedUserId) {
      return NextResponse.json(
        {
          error:
            'Security violation: You cannot modify your own permissions. Please ask another administrator to make this change.',
        },
        { status: 403 }
      )
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('role, standalone_attendance')
      .eq('id', normalizedUserId)
      .single()

    if (existingProfileError || !existingProfile) {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    const fallbackRoleName = existingProfile.role || 'Operator'

    let targetRole: { id: string; name: string } | null = null
    let roleLookupError: Error | null = null

    if (normalizedRole.roleId) {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('id', normalizedRole.roleId)
        .single()

      if (data) {
        targetRole = data
      } else if (error) {
        roleLookupError = error as Error
      }
    }

    if (!targetRole && normalizedRole.roleName) {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', normalizedRole.roleName)
        .single()

      if (data) {
        targetRole = data
      } else if (error) {
        roleLookupError = error as Error
      }
    }

    if (!targetRole) {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', fallbackRoleName)
        .single()

      if (data) {
        targetRole = data
      } else if (error) {
        roleLookupError = error as Error
      }
    }

    if (!targetRole) {
      return NextResponse.json(
        {
          error: `Invalid role selected: ${normalizedRole.roleName || normalizedRole.roleId || fallbackRoleName}`,
          details: roleLookupError?.message,
        },
        { status: 400 }
      )
    }

    // Step 1: Update user profile with role and standalone_attendance flag
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: targetRole.name,
        role_badge: targetRole.name,
        standalone_attendance: normalizedStandaloneAttendance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', normalizedUserId)
      .select()

    if (updateError) {
      return NextResponse.json(
        {
          error: `Failed to update user profile: ${updateError.message}`,
        },
        { status: 500 }
      )
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    const { error: clearRolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', normalizedUserId)

    if (clearRolesError) {
      return NextResponse.json(
        {
          error: `Failed to update user roles: ${clearRolesError.message}`,
        },
        { status: 500 }
      )
    }

    const { error: assignRoleError } = await supabase.from('user_roles').insert({
      user_id: normalizedUserId,
      role_id: targetRole.id,
    })

    if (assignRoleError) {
      return NextResponse.json(
        {
          error: `Failed to assign role: ${assignRoleError.message}`,
        },
        { status: 500 }
      )
    }

    invalidateUserSessions(normalizedUserId)

    // Log to audit_logs with proper fields
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      target_id: normalizedUserId,
      action: 'role_change',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      meta_json: {
        old_role: existingProfile.role,
        new_role: targetRole.name,
        new_role_id: targetRole.id,
        permissions: normalizedPermissions,
        standalone_attendance: normalizedStandaloneAttendance,
        updated_by: user.email,
        updated_at: new Date().toISOString(),
      },
    })

    if (auditError) {
    } else {
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
      data: updateData[0],
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
