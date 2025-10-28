export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/admin/change-user-email
 * Admin can change a user's email address
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const admin = authResult

  try {
    const { userId, newEmail } = await request.json()

    if (!userId || !newEmail) {
      return NextResponse.json({
        success: false,
        error: 'User ID and new email are required'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    console.log(`📧 Admin changing user email: ${userId} → ${newEmail}`)

    const supabase = getSupabaseAdminClient()

    // Update user email using Admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // Auto-confirm the email
    })

    if (error) {
      console.error('❌ Email update error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Update profiles table
    await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId)

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: admin.id,
        target_id: userId,
        action: 'email_changed_by_admin',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        meta_json: {
          new_email: newEmail,
          changed_by: admin.email,
          changed_at: new Date().toISOString()
        }
      })

    console.log('✅ Email changed successfully')

    return NextResponse.json({
      success: true,
      message: `Email updated to ${newEmail}`
    })

  } catch (error: any) {
    console.error('❌ Change user email error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to change email'
    }, { status: 500 })
  }
}
