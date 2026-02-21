export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { requireCSRFToken } from '@/app/lib/middleware/csrf-protection'
import { validateRequest, deleteUserSchema } from '@/app/lib/features/auth/schemas'

const isMissingRelationError = (message: string) =>
  message.toLowerCase().includes('relation') && message.toLowerCase().includes('does not exist')

async function safeNullReference(
  supabaseAdmin: any,
  table: string,
  column: string,
  userId: string
) {
  const { error } = await supabaseAdmin.from(table).update({ [column]: null }).eq(column, userId)
  if (!error) return
  if (isMissingRelationError(error.message || '')) return
  throw new Error(`Failed to clear ${table}.${column} references: ${error.message}`)
}

async function safeDeleteReference(
  supabaseAdmin: any,
  table: string,
  column: string,
  userId: string
) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, userId)
  if (!error) return
  if (isMissingRelationError(error.message || '')) return
  throw new Error(`Failed to delete ${table}.${column} references: ${error.message}`)
}

async function safeNullifyAuthReferences(supabaseAdmin: any, userId: string) {
  // Clear NO ACTION FK blockers before deleting from auth.users.
  await safeNullReference(supabaseAdmin, 'audit_logs', 'actor_id', userId)
  await safeNullReference(supabaseAdmin, 'call_recordings', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'global_settings', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'schedule_outputs', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'security_audit_logs', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'task_assignments', 'assigned_by', userId)
  await safeNullReference(supabaseAdmin, 'tasks', 'created_by', userId)
  await safeNullReference(supabaseAdmin, 'temp_schedule_sessions', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'timeline_data', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'timeline_sessions', 'user_id', userId)
  await safeNullReference(supabaseAdmin, 'production_orders', 'created_by', userId)

  // These columns are NOT NULL and cannot be nulled.
  await safeDeleteReference(supabaseAdmin, 'saved_orders', 'user_id', userId)
  await safeDeleteReference(supabaseAdmin, 'user_activity', 'user_id', userId)
}

// Handle both DELETE and POST methods for backwards compatibility
async function handleDeleteUser(request: NextRequest) {
  // ✅ SECURITY FIX: Check CSRF token first
  const csrfResult = await requireCSRFToken(request)
  if (csrfResult) return csrfResult

  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    // Validate input with Zod schema
    const body = await request.json()
    // Validate strictly but keep access to other fields if needed
    const { userId, userEmail } = await validateRequest(deleteUserSchema, body)
    const userName = body.userName // Extract optional field not in strict schema

    const supabaseAdmin = getSupabaseAdminClient()
    await safeNullifyAuthReferences(supabaseAdmin, userId)

    // Remove role bindings first to prevent stale assignments.
    const { error: userRolesDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (userRolesDeleteError) {
      return NextResponse.json({
        error: `Failed to delete user roles: ${userRolesDeleteError.message}`
      }, { status: 500 })
    }

    // Delete from profiles table so user disappears from app user lists.
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      return NextResponse.json({
        error: `Failed to delete user profile: ${profileDeleteError.message}`
      }, { status: 500 })
    }

    // Best effort auth cleanup. Some projects have FK dependencies on auth.users that
    // prevent hard delete and raise "Database error deleting user".
    let authDeletionMode: 'deleted' | 'already_deleted' | 'anonymized'
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (!authDeleteError) {
      authDeletionMode = 'deleted'
    } else {
      const message = authDeleteError.message?.toLowerCase() || ''
      const alreadyDeleted = message.includes('not found') || message.includes('user not found')

      if (alreadyDeleted) {
        authDeletionMode = 'already_deleted'
      } else {
        const fallbackEmail = `deleted_${Date.now()}_${userId.slice(0, 8)}@deleted.local`
        const { error: fallbackAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: fallbackEmail,
          email_confirm: true,
          user_metadata: {
            full_name: 'Deleted User',
            deleted_at: new Date().toISOString(),
            deleted_by: user.email
          },
          app_metadata: {
            deleted: true
          },
          // effectively blocks sign-in on this account
          ban_duration: '876000h'
        })

        if (fallbackAuthError) {
          return NextResponse.json({
            error: `Failed to delete auth user: ${authDeleteError.message}`,
            details: `Fallback anonymization also failed: ${fallbackAuthError.message}`
          }, { status: 500 })
        }

        authDeletionMode = 'anonymized'
      }
    }

    // Log audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: user.id, // ✅ FIXED: Get from authenticated user
        target_id: userId,
        action: 'user_deleted',
        meta_json: {
          deleted_user: {
            email: userEmail,
            full_name: userName
          },
          auth_deletion_mode: authDeletionMode,
          deleted_by: user.email,
          deleted_at: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: `User ${userName || userEmail} has been deleted`,
      data: {
        userId,
        userEmail,
        authDeletionMode,
        deletedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    const isValidationError = error?.message?.startsWith('Validation failed')
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: isValidationError ? 400 : 500 })
  }
}

// Export both DELETE and POST methods
export async function DELETE(request: NextRequest) {
  return handleDeleteUser(request)
}

export async function POST(request: NextRequest) {
  return handleDeleteUser(request)
}
