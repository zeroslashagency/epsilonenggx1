import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

// Get audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
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
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
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
