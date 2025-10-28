export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/admin/user-activity-logs?userId=xxx
 * Get activity logs for a specific user
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    console.log(`🔍 Fetching activity logs for user: ${userId}`)

    // Get audit logs where this user is the target (actions performed ON them)
    const { data: targetLogs, error: targetError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (targetError) {
      console.error('Error fetching target logs:', targetError)
    }

    // Get audit logs where this user is the actor (actions performed BY them)
    const { data: actorLogs, error: actorError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (actorError) {
      console.error('Error fetching actor logs:', actorError)
    }

    // Combine and deduplicate logs
    const allLogs = [...(targetLogs || []), ...(actorLogs || [])]
    const uniqueLogs = Array.from(
      new Map(allLogs.map(log => [log.id, log])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`✅ Found ${uniqueLogs.length} activity logs for user`)

    // Enhance logs with user information
    const enhancedLogs = await enhanceLogsWithUserInfo(supabase, uniqueLogs)

    return NextResponse.json({
      success: true,
      logs: enhancedLogs,
      count: enhancedLogs.length
    })

  } catch (error: any) {
    console.error('❌ User activity logs error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to enhance logs with user information
async function enhanceLogsWithUserInfo(supabase: any, logs: any[]): Promise<any[]> {
  const userIds = [...new Set([
    ...logs.map(log => log.actor_id),
    ...logs.map(log => log.target_id)
  ].filter(Boolean))]

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const userMap = new Map(users?.map((user: any) => [user.id, user]) || [])

  return logs.map(log => ({
    ...log,
    actor: userMap.get(log.actor_id),
    target_user: userMap.get(log.target_id),
    description: generateLogDescription(log, userMap)
  }))
}

// Helper function to generate human-readable descriptions
function generateLogDescription(log: any, userMap: Map<string, any>): string {
  const actor = userMap.get(log.actor_id)
  const target = userMap.get(log.target_id)
  const actorName = actor?.full_name || actor?.email || 'System'
  const targetName = target?.full_name || target?.email || 'Unknown User'

  switch (log.action) {
    case 'role_change':
      const oldRole = log.meta_json?.old_role || 'Unknown'
      const newRole = log.meta_json?.new_role || 'Unknown'
      return `${actorName} changed role from ${oldRole} to ${newRole}`
    
    case 'user_contact_updated':
      return `${actorName} updated contact information`
    
    case 'user_deletion':
      return `${actorName} deleted user account`
    
    case 'user_created':
      return `${actorName} created user account`
    
    case 'permission_grant':
      return `${actorName} granted permission "${log.meta_json?.permission || 'Unknown'}"`
    
    case 'permission_revoke':
      return `${actorName} revoked permission "${log.meta_json?.permission || 'Unknown'}"`
    
    case 'login':
      return `Logged into the system`
    
    case 'logout':
      return `Logged out of the system`
    
    case 'password_change':
      return `${actorName} changed password`
    
    case 'password_reset':
      return `${actorName} reset password`
    
    case 'profile_update':
      return `${actorName} updated profile information`
    
    default:
      return `${actorName} performed ${log.action.replace('_', ' ')} action`
  }
}
