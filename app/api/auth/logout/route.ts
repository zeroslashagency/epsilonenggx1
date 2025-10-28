export const dynamic = 'force-dynamic'

/**
 * Logout API Route
 * Handles user logout
 * 
 * @route POST /api/auth/logout
 * @security Requires authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/middleware/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { successResponse, serverErrorResponse } from '@/app/lib/utils/api-response'

export async function POST(request: NextRequest) {
  // Check authentication
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get token from header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7) // Remove 'Bearer ' prefix

    // Sign out the session
    if (token) {
      await supabase.auth.admin.signOut(token)
    }

    // Log logout
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'logout',
        meta_json: {
          email: user.email,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })

    return successResponse(null, 'Logout successful')

  } catch (error: any) {
    console.error('Logout error:', error)
    return serverErrorResponse('Logout failed', error)
  }
}
