export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * Modify a user's role (Pure RBAC).
 *
 * Dual enforcement:
 *  1. App layer — requirePermission('users.edit').
 *  2. DB layer  — app_admin_assign_role_by_id() is SECURITY DEFINER and
 *                 re-checks is_admin(auth.uid()); the public anon key cannot
 *                 write user_roles directly (anon RLS write policy removed).
 *
 * The RPC atomically replaces role bindings, syncs profiles.role, and writes
 * an audit_logs entry. No service_role key required.
 *
 * Custom per-user permissions are intentionally unsupported in Pure RBAC:
 * permissions derive from the assigned role only.
 */
export async function PUT(request: NextRequest) {
  const authResult = await requirePermission(request, 'users.edit')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { userId, roleId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseForRequest(request)
    const { error } = await supabase.rpc('app_admin_assign_role_by_id', {
      target: userId,
      p_role_id: roleId,
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('forbidden') || error.code === '42501') {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to modify user roles.' },
          { status: 403 }
        )
      }
      if (msg.includes('unauthenticated') || error.code === '28000') {
        return NextResponse.json(
          { success: false, error: 'Authentication required.' },
          { status: 401 }
        )
      }
      if (msg.includes('not_found')) {
        return NextResponse.json(
          { success: false, error: error.message.replace(/^NOT_FOUND:\s*/i, '') },
          { status: 404 }
        )
      }
      if (msg.includes('last super admin') || error.code === 'P0001') {
        return NextResponse.json(
          { success: false, error: error.message.replace(/^CONFLICT:\s*/i, '') },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Failed to update user role: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
