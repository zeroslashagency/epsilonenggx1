export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { withAuth } from '@/app/lib/api-wrapper'

/**
 * GET /api/schedule/employee
 * Get schedule for a specific employee within a date range
 * Query params: employee_code, from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employee_code = searchParams.get('employee_code')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!employee_code || !from || !to) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: employee_code, from, to' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Fetch from employee_daily_schedule
    const { data: schedule, error } = await supabase
      .from('employee_daily_schedule')
      .select('*')
      .eq('employee_code', employee_code)
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date', { ascending: true })

    if (error) throw error

    // Transform to match the frontend expectations
    const transformedSchedule = schedule.map(day => ({
      date: day.work_date,
      shift_name: day.shift_name,
      start_time: day.shift_start,
      end_time: day.shift_end,
      color: day.color || '#3B82F6',
      overnight: day.overnight,
      id: day.id
    }))

    return NextResponse.json({
      success: true,
      data: {
        schedule: transformedSchedule
      }
    })

  } catch (error: any) {
    console.error('[EmployeeScheduleAPI] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}, { requiredPermission: 'schedule.view' })
