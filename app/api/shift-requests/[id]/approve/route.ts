export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/shift-requests/[id]/approve
 * Approve a shift change request and update employee assignment
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
    const { comments } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
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

    // Start transaction by updating request status first
    const { error: updateError } = await supabase
      .from('shift_change_requests')
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

    // Close any existing open-ended assignments for this employee
    const { error: closeError } = await supabase
      .from('employee_shift_assignments')
      .update({ 
        end_date: new Date(new Date(request.effective_date).getTime() - 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0] 
      })
      .eq('employee_code', request.employee_code)
      .is('end_date', null)

    if (closeError) {
      console.error('Error closing previous assignments:', closeError)
    }

    // Create new assignment based on approved request
    const newAssignment = {
      employee_code: request.employee_code,
      assignment_type: request.assignment_type,
      shift_template_id: request.assignment_type === 'fixed' ? request.requested_shift_id : null,
      rotation_profile_id: request.assignment_type === 'rotation' ? request.requested_rotation_id : null,
      start_date: request.effective_date,
      end_date: request.end_date,
      created_by: user.id
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('employee_shift_assignments')
      .insert(newAssignment)
      .select()
      .single()

    if (assignmentError) {
      console.error('Error creating new assignment:', assignmentError)
      // Rollback request approval
      await supabase
        .from('shift_change_requests')
        .update({ status: 'pending', approved_by: null, approved_at: null })
        .eq('id', id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to create new shift assignment' },
        { status: 500 }
      )
    }

    // Create audit logs
    await Promise.all([
      supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'shift_change_approved',
        target_id: id,
        meta_json: {
          employee_code: request.employee_code,
          assignment_type: request.assignment_type,
          effective_date: request.effective_date,
          comments: comments
        }
      }),
      supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'shift_assignment_created',
        target_id: assignment.id,
        meta_json: {
          employee_code: request.employee_code,
          assignment_type: request.assignment_type,
          from_request_id: id
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Shift change request approved successfully',
      data: {
        request: { ...request, status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() },
        assignment: assignment
      }
    })

  } catch (error: any) {
    console.error('Error in approve shift request API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
