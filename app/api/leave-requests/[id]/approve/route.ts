export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/leave-requests/[id]/approve
 * Approve a leave request and update balances
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requirePermission(request, 'leave.approve')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { id } = params
    const body = await request.json()
    const { comments } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get the leave request
    const { data: leaveRequest, error: requestError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single()

    if (requestError || !leaveRequest) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found or already processed' },
        { status: 404 }
      )
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        comments: comments
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating request status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to approve request' },
        { status: 500 }
      )
    }

    // Update leave balance - move from pending to used
    const currentYear = new Date(leaveRequest.start_date).getFullYear()
    const { data: balance } = await supabase
      .from('employee_leave_balances')
      .select('*')
      .eq('employee_code', leaveRequest.employee_code)
      .eq('leave_type_id', leaveRequest.leave_type_id)
      .eq('year', currentYear)
      .single()

    if (balance) {
      await supabase
        .from('employee_leave_balances')
        .update({
          used_days: (balance.used_days || 0) + leaveRequest.total_days,
          pending_days: Math.max(0, (balance.pending_days || 0) - leaveRequest.total_days)
        })
        .eq('id', balance.id)
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'leave_request_approved',
      target_id: id,
      meta_json: {
        employee_code: leaveRequest.employee_code,
        leave_type_id: leaveRequest.leave_type_id,
        start_date: leaveRequest.start_date,
        end_date: leaveRequest.end_date,
        total_days: leaveRequest.total_days,
        comments: comments
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      data: { ...leaveRequest, status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }
    })

  } catch (error: any) {
    console.error('Error in approve leave request API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
