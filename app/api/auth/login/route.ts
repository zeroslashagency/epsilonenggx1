/**
 * Login API Route
 * Handles user authentication
 * 
 * @route POST /api/auth/login
 */
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/app/lib/utils/api-response'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { loginSchema } from '@/app/lib/validation/schemas'
import { checkRateLimit, authRateLimit } from '@/app/lib/middleware/rate-limit.middleware'

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first (5 attempts per 15 minutes)
    const rateLimitResult = await checkRateLimit(request, authRateLimit)
    if (!rateLimitResult.success) return rateLimitResult.response

    // Validate request body
    const validation = await validateRequestBody(request, loginSchema)
    if (!validation.success) return validation.response
    
    const { email, password } = validation.data

    const supabase = getSupabaseAdminClient()

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error.message)
      return unauthorizedResponse('Invalid email or password')
    }

    if (!data.user || !data.session) {
      return unauthorizedResponse('Authentication failed')
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, role_badge, created_at')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
    }

    // Update last login timestamp
    await supabase
      .from('profiles')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.user.id)

    // Log successful login
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: data.user.id,
        action: 'login',
        meta_json: {
          email: data.user.email,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || null,
        role: profile?.role || profile?.role_badge || 'Employee',
        created_at: profile?.created_at || data.user.created_at
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    }, 'Login successful')

  } catch (error: any) {
    console.error('Login error:', error)
    return serverErrorResponse('Login failed', error)
  }
}
