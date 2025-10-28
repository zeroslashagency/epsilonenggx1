export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require system.audit permission
  const authResult = await requirePermission(request, 'system.audit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Fetching audit logs for user:', userId)

    // Get audit logs for the specific user
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('id, action, meta_json, ip, created_at, actor_id')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    // Get actor information for logs that have actor_id
    const actorIds = auditLogs?.filter(log => log.actor_id).map(log => log.actor_id) || []
    let actors: any[] = []
    
    if (actorIds.length > 0) {
      const { data: actorsData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', actorIds)
      actors = actorsData || []
    }

    // Transform the data for frontend consumption
    const transformedLogs = auditLogs?.map(log => {
      const actor = log.actor_id ? actors.find(a => a.id === log.actor_id) : null
      
      return {
        id: log.id,
        action: log.action,
        description: log.meta_json?.description || `${log.action} performed`,
        details: log.meta_json,
        actor: actor ? {
          email: actor.email,
          full_name: actor.full_name
        } : {
          email: 'system',
          full_name: 'System'
        },
        ip: log.ip,
        timestamp: log.created_at
      }
    }) || []

    console.log('Found audit logs:', transformedLogs.length)

    return NextResponse.json({
      auditLogs: transformedLogs
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
