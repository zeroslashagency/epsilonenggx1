import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const currentUser = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const userId = params.userId

    console.log(`🔍 Fetching activity logs for user: ${userId}`)

    // Get logs where user is the actor OR the target
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('❌ Error fetching user activity logs:', error)
      throw error
    }

    // Convert audit_logs format to expected format
    const logs = auditLogs.map((log: any) => ({
      id: log.id,
      user_id: log.actor_id || 'system',
      target_user_id: log.target_id,
      action: log.action,
      description: generateActionDescription(log.action, log.meta_json),
      timestamp: log.created_at,
      ip: log.ip,
      details: log.meta_json || {}
    }))

    // Enhance logs with user information
    const enhancedLogs = await enhanceLogsWithUserInfo(supabase, logs)

    console.log(`✅ Found ${enhancedLogs.length} activity logs for user ${userId}`)

    return NextResponse.json({
      success: true,
      logs: enhancedLogs,
      count: enhancedLogs.length
    })

  } catch (error: any) {
    console.error('❌ User activity logs error:', error)
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
  ].filter(id => id && id !== 'system'))]

  if (userIds.length === 0) {
    return logs
  }

  // Fetch user information
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const userMap = new Map(users?.map((user: any) => [user.id, user]) || [])

  // Enhance logs with user information
  return logs.map(log => ({
    ...log,
    actor: log.user_id === 'system' ? { full_name: 'System', email: 'system', role: 'System' } : userMap.get(log.user_id),
    target_user: userMap.get(log.target_user_id),
    description: log.description || generateLogDescription({
      ...log,
      actor: log.user_id === 'system' ? { full_name: 'System' } : userMap.get(log.user_id),
      target_user: userMap.get(log.target_user_id)
    })
  }))
}

// Helper function to generate action descriptions from meta_json
function generateActionDescription(action: string, metaJson: any): string {
  switch (action) {
    case 'user_deletion':
      return `User account deleted`
    case 'user_permissions_updated':
      return `User permissions updated`
    case 'permission_grant':
      return `Permission granted: ${metaJson?.permission || 'Unknown'}`
    case 'permission_revoke':
      return `Permission revoked: ${metaJson?.permission || 'Unknown'}`
    case 'role_change':
      return `Role changed to: ${metaJson?.new_role || metaJson?.role || 'Unknown'}`
    case 'modify_user':
      return `User information modified`
    case 'user_updated':
      return `User profile updated`
    default:
      return `${action.replace('_', ' ')} activity`
  }
}

// Helper function to generate human-readable descriptions
function generateLogDescription(log: any): string {
  const actorName = log.actor?.full_name || log.actor?.email || 'System'
  const targetName = log.target_user?.full_name || log.target_user?.email || 'User'

  switch (log.action) {
    case 'user_deletion':
      return `${actorName} deleted user account: ${targetName}`
    
    case 'user_permissions_updated':
      const permissions = log.details?.permissions || []
      return `${actorName} updated permissions for ${targetName} (${permissions.length} permissions)`
    
    case 'role_change':
      return `${actorName} changed role for ${targetName} to ${log.details?.new_role || log.details?.role || 'Unknown'}`
    
    case 'permission_grant':
      return `${actorName} granted permission "${log.details?.permission || 'Unknown'}" to ${targetName}`
    
    case 'permission_revoke':
      return `${actorName} revoked permission "${log.details?.permission || 'Unknown'}" from ${targetName}`
    
    case 'modify_user':
      return `${actorName} modified user information for ${targetName}`
    
    case 'user_updated':
      return `${actorName} updated profile for ${targetName}`
    
    default:
      return `${actorName} performed ${log.action.replace('_', ' ')} on ${targetName}`
  }
}
