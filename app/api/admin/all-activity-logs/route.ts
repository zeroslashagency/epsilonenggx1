export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // Require Admin or Super Admin
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    

    // Try to get real audit logs first
    let auditLogs: any[] = []
    let systemLogs: any[] = []

    try {
      const { data: realAuditLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('📊 Audit logs query result:', { 
        count: realAuditLogs?.length || 0, 
        error: error?.message,
        sample: realAuditLogs?.[0]
      })

      if (!error && realAuditLogs && realAuditLogs.length > 0) {
        // Convert audit_logs format to our expected format
        auditLogs = realAuditLogs.map((log: any) => ({
          id: log.id,
          user_id: log.actor_id || 'system',
          target_user_id: log.target_id,
          action: log.action,
          description: log.meta_json?.description || generateActionDescription(log.action, log.meta_json),
          timestamp: log.created_at,
          ip: log.ip || 'unknown',
          details: log.meta_json || {}
        }))
      } else {
      }
    } catch (tableError: any) {
    }

    // Always get system activity data to supplement
    systemLogs = await getRealActivityLogs(supabase)

    // Combine real audit logs with system logs
    const logs = [...auditLogs, ...systemLogs]

    // Enhance logs with user information if not already present
    const enhancedLogs = await enhanceLogsWithUserInfo(supabase, logs)


    // Calculate statistics
    const stats = {
      totalActivities: enhancedLogs.length,
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
      message: `Retrieved ${enhancedLogs.length} activity logs`
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to get real activity logs from system data
async function getRealActivityLogs(supabase: any): Promise<any[]> {
  try {
    // Get recent user activities from profiles table changes
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)
    
    if (!profiles || profiles.length === 0) {
      return []
    }

    // Generate activity logs from profile data
    const activityLogs = profiles.map((profile: any) => ({
      id: `profile_${profile.id}_${Date.now()}`,
      user_id: profile.id,
      target_user_id: profile.id,
      action: 'profile_activity',
      description: `Profile activity for ${profile.full_name || profile.email}`,
      timestamp: profile.updated_at || profile.created_at,
      ip: 'system',
      details: {
        role: profile.role,
        email: profile.email
      }
    }))

    return activityLogs
    
  } catch (error) {
    return []
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
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const userMap = new Map(users?.map((user: any) => [user.id, user]) || [])

  // Enhance logs with user information
  return logs.map(log => ({
    ...log,
    actor: log.actor || userMap.get(log.user_id),
    target_user: log.target_user || userMap.get(log.target_user_id),
    description: log.description || generateLogDescription({
      ...log,
      actor: log.actor || userMap.get(log.user_id),
      target_user: log.target_user || userMap.get(log.target_user_id)
    })
  }))
}

// Helper function to generate action descriptions from meta_json
function generateActionDescription(action: string, metaJson: any): string {
  switch (action) {
    case 'user_deletion':
      return `User account deleted: ${metaJson?.deleted_user?.full_name || 'Unknown User'}`
    case 'user_deletion_completed':
      return `User deletion completed: ${metaJson?.deleted_user?.full_name || 'Unknown User'}`
    case 'role_change':
      return `Role changed to: ${metaJson?.new_role || 'Unknown Role'}`
    case 'modify_user':
      return `User permissions modified`
    default:
      return `${action.replace('_', ' ')} activity`
  }
}

// Helper function to generate human-readable descriptions
function generateLogDescription(log: any): string {
  const actorName = log.actor?.full_name || log.actor?.email || 'System'
  const targetName = log.target_user?.full_name || log.target_user?.email || 'Unknown User'

  switch (log.action) {
    case 'user_deletion':
      return `${actorName} deleted user account: ${log.details?.deleted_user?.full_name || targetName}`
    
    case 'user_deletion_completed':
      return `User account deletion completed: ${log.details?.deleted_user?.full_name || targetName}`
    
    case 'role_change':
      return `${actorName} changed role for ${targetName} to ${log.details?.new_role || 'Unknown Role'}`
    
    case 'permission_grant':
      return `${actorName} granted permission "${log.details?.permission || 'Unknown'}" to ${targetName}`
    
    case 'permission_revoke':
      return `${actorName} revoked permission "${log.details?.permission || 'Unknown'}" from ${targetName}`
    
    case 'login':
      return `${actorName} logged into the system`
    
    case 'logout':
      return `${actorName} logged out of the system`
    
    case 'password_change':
      return `${actorName} changed password for ${targetName}`
    
    case 'password_reset':
      return `${actorName} reset password for ${targetName}`
    
    case 'user_created':
      return `${actorName} created new user account: ${targetName}`
    
    case 'profile_update':
      return `${actorName} updated profile information for ${targetName}`
    
    default:
      return `${actorName} performed ${log.action.replace('_', ' ')} action`
  }
}
