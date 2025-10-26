import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/monitoring/alerts
 * Retrieve all system alerts
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const severity = searchParams.get('severity')
    const acknowledged = searchParams.get('acknowledged')
    
    let query = supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity)
    }
    
    if (acknowledged !== null && acknowledged !== 'all') {
      query = query.eq('acknowledged', acknowledged === 'true')
    }
    
    const { data: alerts, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: alerts
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts'
    }, { status: 500 })
  }
}

/**
 * POST /api/monitoring/alerts
 * Create a new system alert
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { title, message, severity, source } = body
    
    if (!title || !message || !severity || !source) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: alert, error } = await supabase
      .from('system_alerts')
      .insert({
        title,
        message,
        severity,
        source
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: alert,
      message: 'Alert created successfully'
    })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alert'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/monitoring/alerts
 * Acknowledge an alert
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { id } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required'
      }, { status: 400 })
    }
    
    const { data: alert, error } = await supabase
      .from('system_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'alert_acknowledged',
        meta_json: {
          alert_id: id,
          acknowledged_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    })
  } catch (error) {
    console.error('Error acknowledging alert:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
    }, { status: 500 })
  }
}
