export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: NextRequest) {
  // Require Admin or Super Admin
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) {
    return authResult
  }
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const searchParams = request.nextUrl.searchParams
    const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE)
    const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT)
    const limit = Math.min(requestedLimit, MAX_LIMIT)
    const actionFilter = searchParams.get('action')
    const userFilter = searchParams.get('user')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const offset = (page - 1) * limit

    // Get all audit logs from audit_logs table
    let actorIdsFilter: string[] | null = null
    if (userFilter && userFilter !== 'all') {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userFilter)) {
        actorIdsFilter = [userFilter]
      } else {
        const normalizedFilter = userFilter.trim()
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${normalizedFilter}%,email.ilike.%${normalizedFilter}%`)
          .limit(200)

        actorIdsFilter = (matchingProfiles || []).map((profile: any) => profile.id)
      }
    }

    if (actorIdsFilter && actorIdsFilter.length === 0) {
      return NextResponse.json({
        success: true,
        logs: [],
        stats: {
          totalActivities: 0,
          activeUsers: 0,
          deletions: 0,
          permissionChanges: 0,
          recentActivities: 0,
        },
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 1,
        },
        message: 'Retrieved 0 activity logs',
      })
    }

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter)
    }

    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00.000Z`)
    }

    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59.999Z`)
    }

    if (actorIdsFilter && actorIdsFilter.length > 0) {
      query = query.in('actor_id', actorIdsFilter)
    }

    const { data: realAuditLogs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ Error fetching audit logs:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch audit logs',
        details: error.message
      }, { status: 500 })
    }

    // Convert audit_logs format to our expected format
    const logs = (realAuditLogs || []).map((log: any) => {
      return {
        id: log.id,
        user_id: log.actor_id || 'system',
        target_user_id: log.target_id,
        action: log.action,
        timestamp: log.created_at,
        ip: log.ip || 'unknown',
        details: log.meta_json || {}
      }
    })

    // Enhance logs with user information - this will generate proper descriptions
    const enhancedLogs = await enhanceLogsWithUserInfo(supabase, logs)

    // Calculate statistics
    const totalCount = count ?? enhancedLogs.length
    const totalPages = Math.max(1, Math.ceil(totalCount / limit))
    const stats = {
      totalActivities: totalCount,
      activeUsers: new Set(enhancedLogs.map(log => log.user_id).filter(Boolean)).size,
      deletions: enhancedLogs.filter(log => log.action === 'user_deletion').length,
      permissionChanges: enhancedLogs.filter(log =>
        log.action === 'permission_grant' ||
        log.action === 'permission_revoke' ||
        log.action === 'role_change'
      ).length,
      recentActivities: enhancedLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return logDate >= oneDayAgo
      }).length
    }

    return NextResponse.json({
      success: true,
      logs: enhancedLogs,
      stats: stats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      message: `Retrieved ${enhancedLogs.length} activity logs`
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}


// Helper function to enhance logs with user information
async function enhanceLogsWithUserInfo(supabase: any, logs: any[]): Promise<any[]> {
  // Get all unique user IDs from logs
  const userIds = [...new Set([
    ...logs.map(log => log.user_id),
    ...logs.map(log => log.target_user_id)
  ].filter(Boolean))]

  // Fetch user information
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const userMap = new Map(users?.map((user: any) => [user.id, user]) || [])

  // Enhance logs with user information and generate descriptions
  return logs.map(log => {
    const actor = log.actor || userMap.get(log.user_id)
    const target_user = log.target_user || userMap.get(log.target_user_id)

    return {
      ...log,
      actor,
      target_user,
      description: generateLogDescription({
        ...log,
        actor,
        target_user
      })
    }
  })
}

// Helper function to generate human-readable descriptions
function generateLogDescription(log: any): string {
  const actorName = log.actor?.email || log.actor?.full_name || 'System'
  const targetName = log.target_user?.email || log.target_user?.full_name || 'Unknown User'

  // Extract old and new role from meta_json if available
  const oldRole = log.details?.old_role || log.details?.from_role
  const newRole = log.details?.new_role || log.details?.to_role

  switch (log.action) {
    case 'user_deletion':
      return `${actorName} deleted user account: ${log.details?.deleted_user?.full_name || targetName}`

    case 'user_deletion_completed':
      return `User account deletion completed: ${log.details?.deleted_user?.full_name || targetName}`

    case 'role_change':
      if (oldRole && newRole) {
        return `${actorName} changed role from ${oldRole} to ${newRole}`
      }
      return `${actorName} changed role to ${newRole || 'Unknown Role'}`

    case 'user_contact_updated':
      return `${actorName} updated contact information`

    case 'permission_grant':
      return `${actorName} granted permission "${log.details?.permission || 'Unknown'}" to ${targetName}`

    case 'permission_revoke':
      return `${actorName} revoked permission "${log.details?.permission || 'Unknown'}" from ${targetName}`

    case 'login':
      return `${actorName} logged into the system`

    case 'logout':
      return `${actorName} logged out of the system`

    case 'password_change':
      return `${actorName} changed password`

    case 'password_reset':
      return `${actorName} reset password`

    case 'password_reset_sent':
      return `Password reset link sent to ${actorName}`

    case 'email_changed_by_admin':
      return `${actorName} changed email for ${targetName}`

    case 'user_created':
      return `${actorName} created new user account: ${targetName}`

    case 'user_updated':
      return `${actorName} updated user information`

    case 'profile_update':
      return `${actorName} updated profile information`

    case 'user_permissions_updated':
      return `${actorName} updated permissions`

    default:
      return `${actorName} performed ${log.action.replace(/_/g, ' ')} action`
  }
}
