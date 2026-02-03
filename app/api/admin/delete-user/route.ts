export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { requireCSRFToken } from '@/app/lib/middleware/csrf-protection'
import { validateRequest, deleteUserSchema } from '@/app/lib/features/auth/schemas'

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

    // Delete from auth.users using admin client
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      // Continue with profile deletion even if auth deletion fails
    } catch {
      // Continue with profile deletion
    }

    // Delete from profiles table
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      return NextResponse.json({
        error: `Failed to delete user profile: ${profileDeleteError.message}`
      }, { status: 500 })
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
