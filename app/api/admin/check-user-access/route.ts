export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.permissions permission
  const authResult = await requirePermission(request, 'users.permissions')
  if (authResult instanceof NextResponse) return authResult
  const currentUser = authResult

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const requiredPermission = searchParams.get('permission')

    if (!userId || !requiredPermission) {
      return NextResponse.json({ 
        error: 'User ID and permission are required' 
      }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Get user's profile info
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('standalone_attendance, role, full_name')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ 
        error: 'User not found',
        hasAccess: false
      }, { status: 404 })
    }

    // Check if user has the required permission
    let hasAccess = false
    const accessDetails = {
      user: userProfile.full_name,
      role: userProfile.role,
      requiredPermission,
      hasAccess: false,
      accessMethod: 'none'
    }

    // Special case: standalone_attendance permission
    if (requiredPermission === 'standalone_attendance') {
      hasAccess = userProfile.standalone_attendance === 'YES'
      accessDetails.accessMethod = 'profile_flag'
    } else {
      // Check custom permissions
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
        .eq('effect', 'grant')

      // Map frontend permission to database permission
      const permissionMap: Record<string, string> = {
        'dashboard': 'view_dashboard',
        'analytics': 'view_reports',
        'schedule_generator': 'view_schedule',
        'chart': 'view_machine_analyzer',
        'attendance': 'attendance_read',
        'manage_users': 'manage_users'
      }

      const dbPermissionCode = permissionMap[requiredPermission] || requiredPermission

      // Check if user has this permission
      const hasCustomPermission = userPermissions?.some(up => {
        if (up.permissions && typeof up.permissions === 'object' && !Array.isArray(up.permissions)) {
          const permission = up.permissions as { code: string; description: string }
          return permission.code === dbPermissionCode
        }
        return false
      })

      if (hasCustomPermission) {
        hasAccess = true
        accessDetails.accessMethod = 'custom_permission'
      }
    }

    accessDetails.hasAccess = hasAccess

    return NextResponse.json({
      success: true,
      ...accessDetails
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error',
      hasAccess: false
    }, { status: 500 })
  }
}
