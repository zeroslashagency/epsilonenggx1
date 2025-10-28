import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/admin/send-password-reset
 * Send password reset email to user via Supabase Auth
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 })
    }

    console.log(`📧 Sending password reset email to: ${userEmail}`)

    const supabase = getSupabaseAdminClient()

    // Send password reset email using Supabase Auth
    const { data, error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
    })

    if (error) {
      console.error('❌ Password reset error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'password_reset_sent',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        meta_json: {
          target_email: userEmail,
          sent_by: user.email,
          sent_at: new Date().toISOString()
        }
      })

    console.log('✅ Password reset email sent successfully')

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${userEmail}. Please check your inbox.`
    })

  } catch (error: any) {
    console.error('❌ Send password reset error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to send password reset email'
    }, { status: 500 })
  }
}
