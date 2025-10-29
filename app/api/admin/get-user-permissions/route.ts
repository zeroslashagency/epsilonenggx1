export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Get user's profile info first
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('standalone_attendance, role')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Get user's custom permissions (only works for users with auth entries)
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        effect,
        permissions (
          code,
          description
        )
      `)
      .eq('user_id', userId)

    // Map database permission codes back to frontend codes
    const dbToFrontendMap: Record<string, string> = {
      'view_dashboard': 'dashboard',
      'view_schedule': 'schedule_generator',
      'view_schedule_dashboard': 'schedule_generator_dashboard',
      'view_machine_analyzer': 'chart',
      'view_reports': 'analytics',
      'attendance_read': 'attendance',
      'attendance_mark': 'standalone_attendance',
      'manage_users': 'manage_users'
    }

    // Convert permissions to frontend format
    const frontendPermissions: string[] = []
    
    // Add custom permissions (if user has auth entry)
    userPermissions?.forEach(up => {
      if (up.effect === 'grant' && up.permissions && typeof up.permissions === 'object' && !Array.isArray(up.permissions)) {
        const permission = up.permissions as { code: string; description: string }
        const frontendCode = dbToFrontendMap[permission.code] || permission.code
        frontendPermissions.push(frontendCode)
      }
    })

    // ALWAYS add standalone_attendance if enabled in profile (works for all users)
    if (userProfile.standalone_attendance === 'YES') {
      if (!frontendPermissions.includes('standalone_attendance')) {
        frontendPermissions.push('standalone_attendance')
      }
    }

    // For users without auth entries, provide basic default permissions
    if (!userPermissions || userPermissions.length === 0) {
      // Add default dashboard permission for users without custom permissions
      if (!frontendPermissions.includes('dashboard')) {
        frontendPermissions.push('dashboard')
      }
      
    }

    return NextResponse.json({
      success: true,
      permissions: frontendPermissions,
      standalone_attendance: userProfile?.standalone_attendance || 'NO',
      role: userProfile?.role || 'Operator'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
