export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/leave-requests
 * Create a new leave request
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
      leaveTypeId, 
      startDate, 
      endDate,
      totalDays,
      reason,
      emergencyContact,
      leaveDays
    } = body

    // Validate input
    if (!employeeCode || !leaveTypeId || !startDate || !endDate || !totalDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Check leave balance
    const currentYear = new Date().getFullYear()
    const { data: balance } = await supabase
      .from('employee_leave_balances')
      .select('remaining_days, pending_days')
      .eq('employee_code', employeeCode)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', currentYear)
      .single()

    if (balance && balance.remaining_days < totalDays) {
      return NextResponse.json(
        { success: false, error: 'Insufficient leave balance' },
        { status: 400 }
      )
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_code: employeeCode,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason,
        emergency_contact: emergencyContact,
        requested_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leave request:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create leave request', details: error.message },
        { status: 500 }
      )
    }

    // Create leave request days
    if (leaveDays && leaveDays.length > 0) {
      const { error: daysError } = await supabase
        .from('leave_request_days')
        .insert(
          leaveDays.map((day: any) => ({
            leave_request_id: leaveRequest.id,
            leave_date: day.date,
            day_type: day.type || 'full'
          }))
        )

      if (daysError) {
        console.error('Error creating leave days:', daysError)
      }
    }

    // Update pending balance
    if (balance) {
      await supabase
        .from('employee_leave_balances')
        .update({ 
          pending_days: (balance.pending_days || 0) + totalDays 
        })
        .eq('employee_code', employeeCode)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', currentYear)
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'leave_request_created',
      target_id: leaveRequest.id,
      meta_json: {
        employee_code: employeeCode,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Leave request created successfully',
      data: leaveRequest
    })

  } catch (error: any) {
    console.error('Error in leave request API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/leave-requests
 * Get leave requests (filtered by user permissions)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeCode = searchParams.get('employee_code')
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name, code, color),
        requester:profiles!leave_requests_requested_by_fkey(full_name, email),
        approver:profiles!leave_requests_approved_by_fkey(full_name, email),
        leave_days:leave_request_days(leave_date, day_type)
      `)
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)
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
      console.error('Error fetching leave requests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leave requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Error in get leave requests API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
