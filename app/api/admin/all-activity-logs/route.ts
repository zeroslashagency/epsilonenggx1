export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  console.log('🚀 API CALLED: /api/admin/all-activity-logs')
  
  // Require Admin or Super Admin
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) {
    console.log('❌ Auth failed')
    return authResult
  }
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    console.log('✅ Supabase client created')

    // Get all audit logs from audit_logs table
    const { data: realAuditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    console.log('📊 Audit logs fetched:', { count: realAuditLogs?.length, error: error?.message })

    if (error) {
      console.error('❌ Error fetching audit logs:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch audit logs',
        details: error.message
      }, { status: 500 })
    }

    console.log('📊 Sample audit log:', JSON.stringify(realAuditLogs?.[0], null, 2))

    // Convert audit_logs format to our expected format
    const logs = (realAuditLogs || []).map((log: any) => {
      console.log('🔍 Processing log:', { 
        id: log.id, 
        actor_id: log.actor_id,
        target_id: log.target_id,
        action: log.action 
      })
      
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


// Helper function to enhance logs with user information
async function enhanceLogsWithUserInfo(supabase: any, logs: any[]): Promise<any[]> {
  // Get all unique user IDs from logs
  const userIds = [...new Set([
    ...logs.map(log => log.user_id),
    ...logs.map(log => log.target_user_id)
  ].filter(Boolean))]

  console.log('👥 Fetching users for IDs:', userIds)

  // Fetch user information
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  console.log('👥 Users fetched:', { count: users?.length, error: usersError?.message, sample: users?.[0] })

  const userMap = new Map(users?.map((user: any) => [user.id, user]) || [])

  // Enhance logs with user information and generate descriptions
  return logs.map(log => {
    const actor = log.actor || userMap.get(log.user_id)
    const target_user = log.target_user || userMap.get(log.target_user_id)
    
    console.log('🔍 Enhancing log:', {
      log_id: log.id,
      user_id: log.user_id,
      actor_found: !!actor,
      actor_email: actor?.email,
      userMap_size: userMap.size
    })
    
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

// Helper function to generate action descriptions from meta_json
// This is a fallback - the main description is generated in generateLogDescription
function generateActionDescription(action: string, metaJson: any): string {
  return `${action.replace('_', ' ')} activity`
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
