export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireGranularPermission } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/production/tasks
 * Retrieve all production tasks
 */
export async function GET(request: NextRequest) {
  // ✅ Check: production.Tasks.view permission
  const authResult = await requireGranularPermission(request, 'production', 'Tasks', 'view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    
    let query = supabase
      .from('production_tasks')
      .select(`
        *,
        order:production_orders(order_number, customer_name),
        assigned_to:production_personnel(name, employee_id),
        machine:machines(machine_id, name)
      `)
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    
    const { data: tasks, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: tasks
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tasks'
    }, { status: 500 })
  }
}

/**
 * POST /api/production/tasks
 * Create a new production task
 */
export async function POST(request: NextRequest) {
  // ✅ Check: production.Tasks.create permission
  const authResult = await requireGranularPermission(request, 'production', 'Tasks', 'create')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { task_id, title, description, order_id, assigned_to_id, machine_id, status, priority, progress, due_date } = body
    
    if (!task_id || !title || !due_date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: task, error } = await supabase
      .from('production_tasks')
      .insert({
        task_id,
        title,
        description,
        order_id,
        assigned_to_id,
        machine_id,
        status: status || 'pending',
        priority: priority || 'medium',
        progress: progress || 0,
        due_date
      })
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'task_created',
        meta_json: {
          task_id: task.id,
          title: task.title,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task created successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/production/tasks
 * Update a production task
 */
export async function PATCH(request: NextRequest) {
  // ✅ Check: production.Tasks.edit permission
  const authResult = await requireGranularPermission(request, 'production', 'Tasks', 'edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Task ID is required'
      }, { status: 400 })
    }
    
    const { data: task, error } = await supabase
      .from('production_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'task_updated',
        meta_json: {
          task_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task'
    }, { status: 500 })
  }
}
