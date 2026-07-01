export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { getSupabaseAdminClient, hasServiceRoleKey } from '@/app/lib/services/supabase-client'

/**
 * Set a user's password (admin action).
 *
 * This requires the Supabase Auth Admin API (GoTrue), which is only available
 * with a service_role key. Without it we CANNOT change the password, so we must
 * fail honestly instead of returning a false success.
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'users.edit')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { userId, userEmail, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json(
        { success: false, error: 'User ID and password are required' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Honest guard: no service key => cannot touch GoTrue => do NOT fake success.
    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Password reset is unavailable: the server is not configured with a ' +
            'Supabase service-role key. Configure SUPABASE_SERVICE_ROLE_KEY to enable this.',
        },
        { status: 503 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to update password: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${userEmail || userId}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
