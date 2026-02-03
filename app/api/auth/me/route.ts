export const dynamic = 'force-dynamic'

/**
 * Current User API Route
 * Returns the currently authenticated user's profile
 * 
 * @route GET /api/auth/me
 * @security Requires authentication
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/features/auth/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { successResponse, serverErrorResponse } from '@/app/lib/utils/api-response'

export async function GET(request: NextRequest) {
  // Check authentication
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Get full user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return serverErrorResponse('Failed to fetch profile', profileError)
    }

    // Get user's role information
    const { data: userRole } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          name,
          description,
          permissions_json
        )
      `)
      .eq('user_id', user.id)
      .single()

    // Get user's custom permissions
    const { data: customPermissions } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        effect,
        permissions (
          id,
          code,
          description,
          module
        )
      `)
      .eq('user_id', user.id)

    return successResponse({
      user: {
        ...profile,
        role_details: userRole?.roles || null,
        custom_permissions: customPermissions || []
      }
    })

  } catch (error: any) {
    return serverErrorResponse('Failed to fetch user data', error)
  }
}
