export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require read access to users
  const authResult = await requirePermission(request, 'users.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

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

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)

    const roleIds = (userRoles || []).map((row: { role_id: string }) => row.role_id)

    let rolePermissionCodes: string[] = []
    if (roleIds.length > 0) {
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            code
          )
        `)
        .in('role_id', roleIds)

      rolePermissionCodes = (rolePermissions || [])
        .map((row: any) => {
          const permissionData = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions
          return permissionData?.code
        })
        .filter((code: unknown): code is string => typeof code === 'string' && code.length > 0)
    }

    const { data: userPermissionOverrides } = await supabase
      .from('user_permissions')
      .select(`
        effect,
        permissions (
          code
        )
      `)
      .eq('user_id', userId)
      .eq('effect', 'grant')

    const customPermissionCodes = (userPermissionOverrides || [])
      .map((row: any) => {
        const permissionData = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions
        return permissionData?.code
      })
      .filter((code: unknown): code is string => typeof code === 'string' && code.length > 0)

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

    const allPermissionCodes = Array.from(new Set([...rolePermissionCodes, ...customPermissionCodes]))
    const frontendPermissions = allPermissionCodes.map(code => dbToFrontendMap[code] || code)

    // ALWAYS add standalone_attendance if enabled in profile (works for all users)
    if (userProfile.standalone_attendance === 'YES') {
      if (!frontendPermissions.includes('standalone_attendance')) {
        frontendPermissions.push('standalone_attendance')
      }
    }

    if (frontendPermissions.length === 0 && !frontendPermissions.includes('dashboard')) {
      frontendPermissions.push('dashboard')
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
