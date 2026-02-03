export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { userId, newStatus } = await request.json()

    // Validate required fields
    if (!userId || !newStatus) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, newStatus' 
      }, { status: 400 })
    }

    // Validate status value
    if (!['active', 'inactive'].includes(newStatus)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be "active" or "inactive"' 
      }, { status: 400 })
    }

    // Get user details for audit log
    const { data: userData } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('id', userId)
      .single()

    // Update user status in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: newStatus === 'inactive' ? 'deactivated' : userData?.role || 'Operator',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to update user status: ${updateError.message}` 
      }, { status: 500 })
    }

    // If deactivating, remove user roles
    if (newStatus === 'inactive') {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
    }

    // ✅ Log status change activity
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: userId,
        action: newStatus === 'inactive' ? 'user_deactivated' : 'user_activated',
        meta_json: {
          user_email: userData?.email,
          user_name: userData?.full_name,
          new_status: newStatus,
          changed_by: user.email,
          changed_at: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      message: `User ${newStatus === 'inactive' ? 'deactivated' : 'activated'} successfully`,
      newStatus: newStatus
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
