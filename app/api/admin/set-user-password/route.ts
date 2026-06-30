export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  // PERMISSION CHECK: Require users.edit permission
  const authResult = await requirePermission(request, 'users.edit')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { userId, userEmail, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Update the password via Supabase Auth Admin API (requires service role key)
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(userId, { password })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Password updated successfully${userEmail ? ` for ${userEmail}` : ''}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
