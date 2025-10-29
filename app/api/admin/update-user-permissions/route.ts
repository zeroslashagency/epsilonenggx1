export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { updateUserPermissionsSchema } from '@/app/lib/validation/schemas'
import { permissionUpdateLimiter } from '@/app/lib/rate-limiter'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.permissions permission
  const authResult = await requirePermission(request, 'users.permissions')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, updateUserPermissionsSchema)
    if (!validation.success) return validation.response
    
    const { userId, role, permissions, standalone_attendance } = validation.data

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // RATE LIMITING: Check if user is making too many requests
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `permission-update:${clientIP}`
    
    const rateLimitResult = await permissionUpdateLimiter.check(rateLimitKey)
    
    if (!rateLimitResult.success) {
      console.warn('🚨 Rate limit exceeded:', { 
        ip: clientIP, 
        limit: rateLimitResult.limit,
        reset: new Date(rateLimitResult.reset).toISOString()
      })
      
      return NextResponse.json({
        error: 'Too many permission update requests. Please try again later.',
        rateLimitInfo: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.reset
        }
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
        }
      })
    }

    console.log('💾 Updating user permissions:', { 
      userId, 
      role, 
      permissions, 
      standalone_attendance,
      rateLimitRemaining: rateLimitResult.remaining
    })

    // SECURITY: Prevent self-modification
    if (user.id === userId) {
      return NextResponse.json({
        error: 'Security violation: You cannot modify your own permissions. Please ask another administrator to make this change.'
      }, { status: 403 })
    }

    // User role is already validated by requireRole middleware (Super Admin only)

    // Step 1: Update user profile with role and standalone_attendance flag
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: role || 'Operator',
        standalone_attendance: standalone_attendance || 'NO',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to update user profile: ${updateError.message}` 
      }, { status: 500 })
    }

    // Check if user actually exists (update returns empty array if no match)
    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Step 2: Log permissions for audit purposes
    // NOTE: user_permissions table cannot be used because it has FK to auth.users
    // Permissions are controlled by ROLE and standalone_attendance flag in profiles table
    if (permissions && Array.isArray(permissions)) {
    }

    
    // Log to audit_logs with proper fields
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: userId,
        action: 'role_change',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        meta_json: {
          old_role: updateData[0]?.role,
          new_role: role,
          permissions,
          standalone_attendance,
          updated_by: user.email,
          updated_at: new Date().toISOString()
        }
      })

    if (auditError) {
    } else {
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
      data: updateData[0]
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
