export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/leave-balances
 * Get leave balances for employees
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employee_code')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    let query = supabase
      .from('employee_leave_balances')
      .select(`
        *,
        leave_type:leave_types(id, name, code, color, max_days_per_year)
      `)
      .eq('year', year)
      .order('leave_type(name)')

    if (employeeCode) {
      query = query.eq('employee_code', employeeCode)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leave balances:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leave balances' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Error in leave balances API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leave-balances
 * Initialize or update leave balances for an employee
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'leave.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { employeeCode, year, balances } = body

    if (!employeeCode || !year || !balances) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeCode, year, balances' },
        { status: 400 }
      )
    }

    // Upsert balances
    const balanceRecords = balances.map((balance: any) => ({
      employee_code: employeeCode,
      leave_type_id: balance.leave_type_id,
      year: year,
      allocated_days: balance.allocated_days || 0,
      used_days: balance.used_days || 0,
      pending_days: balance.pending_days || 0
    }))

    const { data, error } = await supabase
      .from('employee_leave_balances')
      .upsert(balanceRecords, {
        onConflict: 'employee_code,leave_type_id,year'
      })
      .select()

    if (error) {
      console.error('Error updating leave balances:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update leave balances' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'leave_balances_updated',
      meta_json: {
        employee_code: employeeCode,
        year: year,
        balance_count: balances.length
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Leave balances updated successfully',
      data: data
    })

  } catch (error: any) {
    console.error('Error in update leave balances API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
