/**
 * Audit Logging Utility
 * Logs user actions and page access for security monitoring
 */

import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export interface AuditLogEntry {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log page access for audit trail
 */
export async function logPageAccess(
  userId: string,
  pagePath: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: 'page_access',
      resource_type: 'page',
      resource_id: pagePath,
      meta_json: {
        path: pagePath,
        ip: ipAddress,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    // Silent fail - don't block user if audit logging fails
    console.error('Failed to log page access:', error)
  }
}

/**
 * Log user action for audit trail
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      meta_json: {
        ...entry.details,
        ip: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    // Silent fail - don't block user if audit logging fails
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Log authentication attempt
 */
export async function logAuthAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  reason?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      action: success ? 'login_success' : 'login_failed',
      resource_type: 'auth',
      meta_json: {
        email,
        success,
        reason,
        ip: ipAddress,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log auth attempt:', error)
  }
}

/**
 * Log permission change
 */
export async function logPermissionChange(
  actorId: string,
  targetUserId: string,
  oldPermissions: string[],
  newPermissions: string[],
  ipAddress?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    const added = newPermissions.filter(p => !oldPermissions.includes(p))
    const removed = oldPermissions.filter(p => !newPermissions.includes(p))
    
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      action: 'permission_change',
      resource_type: 'user',
      resource_id: targetUserId,
      meta_json: {
        added,
        removed,
        oldPermissions,
        newPermissions,
        ip: ipAddress,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log permission change:', error)
  }
}

/**
 * Log role change
 */
export async function logRoleChange(
  actorId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      action: 'role_change',
      resource_type: 'user',
      resource_id: targetUserId,
      meta_json: {
        oldRole,
        newRole,
        ip: ipAddress,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log role change:', error)
  }
}

/**
 * Log security event (suspicious activity)
 */
export async function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>,
  userId?: string,
  ipAddress?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: 'security_event',
      resource_type: 'security',
      meta_json: {
        event,
        severity,
        ...details,
        ip: ipAddress,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}
