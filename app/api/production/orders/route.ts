import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/production/orders
 * Retrieve all production orders
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    
    let query = supabase
      .from('production_orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    
    const { data: orders, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.error('Error fetching production orders:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders'
    }, { status: 500 })
  }
}

/**
 * POST /api/production/orders
 * Create a new production order
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { order_number, customer_name, product_name, quantity, status, priority, due_date, notes } = body
    
    // Validation
    if (!order_number || !customer_name || !product_name || !quantity || !due_date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: order, error } = await supabase
      .from('production_orders')
      .insert({
        order_number,
        customer_name,
        product_name,
        quantity,
        status: status || 'pending',
        priority: priority || 'medium',
        due_date,
        notes,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'production_order_created',
        meta_json: {
          order_id: order.id,
          order_number: order.order_number,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: order,
      message: 'Production order created successfully'
    })
  } catch (error) {
    console.error('Error creating production order:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/production/orders
 * Update a production order
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
        error: 'Order ID is required'
      }, { status: 400 })
    }
    
    const { data: order, error } = await supabase
      .from('production_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'production_order_updated',
        meta_json: {
          order_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: order,
      message: 'Production order updated successfully'
    })
  } catch (error) {
    console.error('Error updating production order:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/production/orders
 * Delete a production order
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requirePermission(request, 'operate_machine')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required'
      }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'production_order_deleted',
        meta_json: {
          order_id: id,
          deleted_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      message: 'Production order deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting production order:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete order'
    }, { status: 500 })
  }
}
