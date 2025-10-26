import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/monitoring/maintenance
 * Retrieve all maintenance records
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'view_reports')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    
    let query = supabase
      .from('maintenance_records')
      .select(`
        *,
        machine:machines(machine_id, name, type)
      `)
      .order('scheduled_date', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    
    const { data: records, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: records
    })
  } catch (error) {
    console.error('Error fetching maintenance records:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch maintenance records'
    }, { status: 500 })
  }
}

/**
 * POST /api/monitoring/maintenance
 * Create a new maintenance record
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { machine_id, type, status, technician_id, technician_name, scheduled_date, completed_date, notes } = body
    
    if (!machine_id || !type || !technician_name || !scheduled_date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: record, error } = await supabase
      .from('maintenance_records')
      .insert({
        machine_id,
        type,
        status: status || 'scheduled',
        technician_id,
        technician_name,
        scheduled_date,
        completed_date,
        notes
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Update machine's next_maintenance date
    if (type === 'scheduled' || type === 'preventive') {
      const nextDate = new Date(scheduled_date)
      nextDate.setMonth(nextDate.getMonth() + 3) // Schedule next maintenance in 3 months
      
      await supabase
        .from('machines')
        .update({
          last_maintenance: completed_date || scheduled_date,
          next_maintenance: nextDate.toISOString().split('T')[0]
        })
        .eq('id', machine_id)
    }
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'maintenance_scheduled',
        meta_json: {
          record_id: record.id,
          machine_id,
          type,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: record,
      message: 'Maintenance record created successfully'
    })
  } catch (error) {
    console.error('Error creating maintenance record:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create maintenance record'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/monitoring/maintenance
 * Update a maintenance record
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
        error: 'Maintenance record ID is required'
      }, { status: 400 })
    }
    
    const { data: record, error } = await supabase
      .from('maintenance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // If marking as completed, update machine's last_maintenance
    if (updates.status === 'completed' && updates.completed_date) {
      await supabase
        .from('machines')
        .update({
          last_maintenance: updates.completed_date
        })
        .eq('id', record.machine_id)
    }
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'maintenance_updated',
        meta_json: {
          record_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: record,
      message: 'Maintenance record updated successfully'
    })
  } catch (error) {
    console.error('Error updating maintenance record:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update maintenance record'
    }, { status: 500 })
  }
}
