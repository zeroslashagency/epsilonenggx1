import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'
import { validateQueryParams } from '@/app/lib/middleware/validation.middleware'
import { auditLogQuerySchema } from '@/app/lib/validation/schemas'

// Get audit logs with filtering
export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require system.audit permission
  const authResult = await requirePermission(request, 'system.audit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  // Validate query parameters
  const validation = validateQueryParams(request, auditLogQuerySchema)
  if (!validation.success) return validation.response
  
  const { page, limit, action, userId, startDate, endDate } = validation.data

  try {
    const supabase = getSupabaseAdminClient()
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        actor_id,
        target_id,
        action,
        meta_json,
        ip,
        created_at,
        actor:profiles!audit_logs_actor_id_fkey (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }
    
    if (userId) {
      query = query.or(`actor_id.eq.${userId},target_id.eq.${userId}`)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) throw logsError

    // Get total count for pagination
    let countQuery = supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })

    if (action) countQuery = countQuery.eq('action', action)
    if (userId) countQuery = countQuery.or(`actor_id.eq.${userId},target_id.eq.${userId}`)
    if (startDate) countQuery = countQuery.gte('created_at', startDate)
    if (endDate) countQuery = countQuery.lte('created_at', endDate)

    const { count, error: countError } = await countQuery

    if (countError) throw countError

    // Get recent activity summary
    const { data: recentActivity, error: recentError } = await supabase
      .from('audit_logs')
      .select(`
        action,
        created_at,
        actor:profiles!audit_logs_actor_id_fkey (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    return NextResponse.json({
      success: true,
      data: {
        logs,
        recentActivity,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
    }, { status: 500 })
  }
}

// Create audit log entry
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const {
      actor_id,
      target_id,
      action,
      meta_json = {},
      ip
    } = body

    const { data: log, error: logError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id,
        target_id,
        action,
        meta_json,
        ip
      })
      .select()
      .single()

    if (logError) throw logError

    return NextResponse.json({
      success: true,
      data: { log },
      message: 'Audit log created successfully'
    })

  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create audit log'
    }, { status: 500 })
  }
}
