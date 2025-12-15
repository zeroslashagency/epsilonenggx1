export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/shift-requests/[id]/reject
 * Reject a shift change request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requirePermission(request, 'schedule.approve')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { id } = params
    const body = await request.json()
    const { rejectedReason, comments } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      )
    }

    if (!rejectedReason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get the shift change request
    const { data: request, error: requestError } = await supabase
      .from('shift_change_requests')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single()

    if (requestError || !request) {
      return NextResponse.json(
        { success: false, error: 'Shift change request not found or already processed' },
        { status: 404 }
      )
    }

    // Update request status to rejected
    const { data: updatedRequest, error: updateError } = await supabase
      .from('shift_change_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejected_reason: rejectedReason,
        comments: comments
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting request:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to reject request' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'shift_change_rejected',
      target_id: id,
      meta_json: {
        employee_code: request.employee_code,
        assignment_type: request.assignment_type,
        effective_date: request.effective_date,
        rejected_reason: rejectedReason,
        comments: comments
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Shift change request rejected successfully',
      data: updatedRequest
    })

  } catch (error: any) {
    console.error('Error in reject shift request API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
