export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/app/lib/services/supabase-client'

/**
 * POST /api/user/update-email
 * Update user's email address
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 })
    }

    const { newEmail } = await request.json()

    if (!newEmail) {
      return NextResponse.json({
        success: false,
        error: 'New email is required'
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


    // Update email using Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Log the action
    const adminSupabase = getSupabaseAdminClient()
    await adminSupabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: user.id,
        action: 'email_change_requested',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        meta_json: {
          old_email: user.email,
          new_email: newEmail,
          requested_at: new Date().toISOString()
        }
      })


    return NextResponse.json({
      success: true,
      message: 'Email change confirmation sent. Please check both your old and new email addresses to confirm the change.'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to update email'
    }, { status: 500 })
  }
}
