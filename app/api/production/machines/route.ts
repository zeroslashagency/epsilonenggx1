export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/production/machines
 * Retrieve all machines
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    
    let query = supabase
      .from('machines')
      .select('*, current_order:production_orders(order_number, customer_name)')
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    
    const { data: machines, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: machines
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch machines'
    }, { status: 500 })
  }
}

/**
 * POST /api/production/machines
 * Create a new machine
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { machine_id, name, type, status, efficiency, location, last_maintenance, next_maintenance } = body
    
    if (!machine_id || !name || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: machine, error } = await supabase
      .from('machines')
      .insert({
        machine_id,
        name,
        type,
        status: status || 'idle',
        efficiency: efficiency || 0,
        location,
        last_maintenance,
        next_maintenance
      })
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'machine_created',
        meta_json: {
          machine_id: machine.id,
          machine_name: machine.name,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: machine,
      message: 'Machine created successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create machine'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/production/machines
 * Update a machine
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Machine ID is required'
      }, { status: 400 })
    }
    
    const { data: machine, error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'machine_updated',
        meta_json: {
          machine_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: machine,
      message: 'Machine updated successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update machine'
    }, { status: 500 })
  }
}
