export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/shift-requests
 * Create a new shift change request
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { 
      employeeCode, 
      assignmentType, 
      currentShiftId, 
      requestedShiftId,
      currentRotationId,
      requestedRotationId,
      effectiveDate, 
      endDate,
      reason 
    } = body

    // Validate input
    if (!employeeCode || !assignmentType || !effectiveDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeCode, assignmentType, effectiveDate' },
        { status: 400 }
      )
    }

    if (!['fixed', 'rotation'].includes(assignmentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment type. Must be "fixed" or "rotation"' },
        { status: 400 }
      )
    }

    if (assignmentType === 'fixed' && !requestedShiftId) {
      return NextResponse.json(
        { success: false, error: 'requestedShiftId is required for fixed assignments' },
        { status: 400 }
      )
    }

    if (assignmentType === 'rotation' && !requestedRotationId) {
      return NextResponse.json(
        { success: false, error: 'requestedRotationId is required for rotation assignments' },
        { status: 400 }
      )
    }

    // Create shift change request
    const { data, error } = await supabase
      .from('shift_change_requests')
      .insert({
        employee_code: employeeCode,
        assignment_type: assignmentType,
        current_shift_id: currentShiftId,
        requested_shift_id: requestedShiftId,
        current_rotation_id: currentRotationId,
        requested_rotation_id: requestedRotationId,
        effective_date: effectiveDate,
        end_date: endDate,
        reason: reason,
        requested_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating shift change request:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create shift change request', details: error.message },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'shift_change_requested',
      target_id: data.id,
      meta_json: {
        employee_code: employeeCode,
        assignment_type: assignmentType,
        effective_date: effectiveDate,
        reason: reason
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Shift change request created successfully',
      data: data
    })

  } catch (error: any) {
    console.error('Error in shift request API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shift-requests
 * Get shift change requests (filtered by user permissions)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected
    const employeeCode = searchParams.get('employee_code')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('shift_change_requests')
      .select(`
        *,
        current_shift:shift_templates!shift_change_requests_current_shift_id_fkey(id, name, start_time, end_time, color),
        requested_shift:shift_templates!shift_change_requests_requested_shift_id_fkey(id, name, start_time, end_time, color),
        requester:profiles!shift_change_requests_requested_by_fkey(full_name, email),
        approver:profiles!shift_change_requests_approved_by_fkey(full_name, email)
      `)
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching shift requests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shift requests' },
        { status: 500 }
      )
    }

    let enriched = data || []

    // Enrich rotation info from shift_templates (type='rotation') using stored rotation IDs
    const rotationIds = Array.from(new Set(
      enriched
        .flatMap((r: any) => [r.current_rotation_id, r.requested_rotation_id])
        .filter((id: string | null) => !!id)
    ))

    if (rotationIds.length > 0) {
      const { data: rotationTemplates, error: rotationError } = await supabase
        .from('shift_templates')
        .select('id, name, weeks_pattern')
        .in('id', rotationIds as string[])

      if (rotationError) {
        console.error('Error fetching rotation templates for shift requests:', rotationError)
      }

      const rotationMap = new Map<string, any>(
        (rotationTemplates || []).map((r: any) => [r.id, r])
      )

      enriched = enriched.map((r: any) => ({
        ...r,
        current_rotation: r.current_rotation_id ? rotationMap.get(r.current_rotation_id) || null : null,
        requested_rotation: r.requested_rotation_id ? rotationMap.get(r.requested_rotation_id) || null : null
      }))
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length || 0
    })

  } catch (error: any) {
    console.error('Error in get shift requests API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
