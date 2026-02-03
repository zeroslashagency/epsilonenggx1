export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireGranularPermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/production/personnel
 * Retrieve all production personnel
 */
export async function GET(request: NextRequest) {
  // ✅ Check: production.Personnel.view permission
  const authResult = await requireGranularPermission(request, 'production', 'Personnel', 'view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const shift = searchParams.get('shift')
    
    let query = supabase
      .from('production_personnel')
      .select('*, assigned_machine:machines(machine_id, name)')
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (shift && shift !== 'all') {
      query = query.eq('shift', shift)
    }
    
    const { data: personnel, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: personnel
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch personnel'
    }, { status: 500 })
  }
}

/**
 * POST /api/production/personnel
 * Create a new personnel record
 */
export async function POST(request: NextRequest) {
  // ✅ Check: production.Personnel.create permission
  const authResult = await requireGranularPermission(request, 'production', 'Personnel', 'create')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { employee_id, name, role, shift, status, efficiency_score, assigned_machine_id } = body
    
    if (!employee_id || !name || !role || !shift) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: person, error } = await supabase
      .from('production_personnel')
      .insert({
        employee_id,
        name,
        role,
        shift,
        status: status || 'active',
        efficiency_score: efficiency_score || 0,
        assigned_machine_id
      })
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'personnel_created',
        meta_json: {
          personnel_id: person.id,
          name: person.name,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: person,
      message: 'Personnel created successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create personnel'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/production/personnel
 * Update personnel record
 */
export async function PATCH(request: NextRequest) {
  // ✅ Check: production.Personnel.edit permission
  const authResult = await requireGranularPermission(request, 'production', 'Personnel', 'edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Personnel ID is required'
      }, { status: 400 })
    }
    
    const { data: person, error } = await supabase
      .from('production_personnel')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'personnel_updated',
        meta_json: {
          personnel_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: person,
      message: 'Personnel updated successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update personnel'
    }, { status: 500 })
  }
}
