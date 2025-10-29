export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'
import { checkRateLimit, strictRateLimit } from '@/app/lib/middleware/rate-limit.middleware'

/**
 * POST /api/admin/send-password-reset
 * Send password reset email to user via Supabase Auth
 * Rate limited: 5 requests per 15 minutes (prevents email spam)
 */
export async function POST(request: NextRequest) {
  // Check rate limit first (5 per 15 minutes to prevent email spam)
  const rateLimitResult = await checkRateLimit(request, strictRateLimit)
  if (!rateLimitResult.success) return rateLimitResult.response

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


    const supabase = getSupabaseAdminClient()

    // Send password reset email using Supabase Auth
    const { data, error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
    })

    if (error) {
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


    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${userEmail}. Please check your inbox.`
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to send password reset email'
    }, { status: 500 })
  }
}
