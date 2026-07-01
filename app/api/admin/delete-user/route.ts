export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { requireCSRFToken } from '@/app/lib/middleware/csrf-protection'
import { validateRequest, deleteUserSchema } from '@/app/lib/features/auth/schemas'

/**
 * Delete a user.
 *
 * Authorization is enforced at TWO layers (defense in depth):
 *  1. App layer  — CSRF + requirePermission('manage_users').
 *  2. DB layer   — app_admin_delete_user() is SECURITY DEFINER and re-checks
 *                  is_admin(auth.uid()) inside Postgres, so a forgotten app
 *                  check cannot bypass it, and the public anon key cannot call it.
 *
 * The RPC clears NO ACTION FK references, deletes app rows, and hard-deletes
 * the auth.users row in one transaction — no service_role key required.
 * DB guards: no self-delete, no deleting the last Super Admin.
 */
async function handleDeleteUser(request: NextRequest) {
  // Layer 1a: CSRF
  const csrfResult = await requireCSRFToken(request)
  if (csrfResult) return csrfResult

  // Layer 1b: permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const actor = authResult

  try {
    const body = await request.json()
    const { userId, userEmail } = await validateRequest(deleteUserSchema, body)
    const userName = body.userName

    // Bearer-forwarding client: auth.uid() inside the RPC resolves to the caller,
    // so the DB-layer admin gate applies. Works with or without a service key.
    const supabase = getSupabaseForRequest(request)

    const { data, error } = await supabase.rpc('app_admin_delete_user', {
      target: userId,
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()

      // Map DB guard errors to precise HTTP codes.
      if (msg.includes('forbidden') || error.code === '42501') {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to delete users.' },
          { status: 403 }
        )
      }
      if (msg.includes('unauthenticated') || error.code === '28000') {
        return NextResponse.json(
          { success: false, error: 'Authentication required.' },
          { status: 401 }
        )
      }
      if (
        msg.includes('cannot delete your own') ||
        msg.includes('last super admin') ||
        error.code === 'P0001'
      ) {
        return NextResponse.json(
          { success: false, error: error.message.replace(/^CONFLICT:\s*/i, '') },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: `Failed to delete user: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User ${userName || userEmail} has been deleted`,
      data: {
        userId: data || userId,
        userEmail,
        deletedBy: actor.email,
        deletedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const isValidationError = message.startsWith('Validation failed')
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}

// Support both DELETE and POST for backwards compatibility.
export async function DELETE(request: NextRequest) {
  return handleDeleteUser(request)
}

export async function POST(request: NextRequest) {
  return handleDeleteUser(request)
}
