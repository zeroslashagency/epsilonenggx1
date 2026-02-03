export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireAuth, requireGranularPermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/monitoring/quality
 * Retrieve all quality checks
 */
export async function GET(request: NextRequest) {
  // ✅ Check: monitoring.Quality Control.view permission
  const authResult = await requireGranularPermission(request, 'monitoring', 'Quality Control', 'view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const result = searchParams.get('result')
    
    let query = supabase
      .from('quality_checks')
      .select(`
        *,
        order:production_orders(order_number, customer_name)
      `)
      .order('created_at', { ascending: false })
    
    if (result && result !== 'all') {
      query = query.eq('result', result)
    }
    
    const { data: checks, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: checks
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quality checks'
    }, { status: 500 })
  }
}

/**
 * POST /api/monitoring/quality
 * Create a new quality check
 */
export async function POST(request: NextRequest) {
  // ✅ Check: monitoring.Quality Control.create permission
  const authResult = await requireGranularPermission(request, 'monitoring', 'Quality Control', 'create')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { order_id, product, inspector_id, inspector_name, result, defects, notes } = body
    
    if (!product || !inspector_name || !result) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    const { data: check, error } = await supabase
      .from('quality_checks')
      .insert({
        order_id,
        product,
        inspector_id,
        inspector_name,
        result,
        defects: defects || 0,
        notes
      })
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'quality_check_created',
        meta_json: {
          check_id: check.id,
          product: check.product,
          result: check.result,
          created_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: check,
      message: 'Quality check created successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quality check'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/monitoring/quality
 * Update a quality check
 */
export async function PATCH(request: NextRequest) {
  // ✅ Check: monitoring.Quality Control.edit permission
  const authResult = await requireGranularPermission(request, 'monitoring', 'Quality Control', 'edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Quality check ID is required'
      }, { status: 400 })
    }
    
    const { data: check, error } = await supabase
      .from('quality_checks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'quality_check_updated',
        meta_json: {
          check_id: id,
          updates,
          updated_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: check,
      message: 'Quality check updated successfully'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update quality check'
    }, { status: 500 })
  }
}
