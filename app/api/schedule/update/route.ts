export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { withAuth } from '@/app/lib/api-wrapper'

/**
 * POST /api/schedule/update
 * Updates a single employee's schedule for a specific date (Assign/Unassign/Move)
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { employee_code, work_date, shift_id, action } = body

    if (!employee_code || !work_date || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'unassign') {
      // Remove the record for this day
      const { error } = await supabase
        .from('employee_daily_schedule')
        .delete()
        .match({ employee_code, work_date })

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Shift unassigned' })
    }

    if (action === 'assign') {
      if (!shift_id) {
        return NextResponse.json(
          { success: false, error: 'shift_id is required for assignment' },
          { status: 400 }
        )
      }

      // Fetch template details to denormalize into the daily record
      const { data: template, error: templateError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', shift_id)
        .single()

      if (templateError || !template) {
        return NextResponse.json(
          { success: false, error: 'Shift template not found' },
          { status: 404 }
        )
      }

      // Upsert the daily record
      const { error: upsertError } = await supabase
        .from('employee_daily_schedule')
        .upsert({
          employee_code,
          work_date,
          shift_name: template.name,
          shift_start: template.start_time,
          shift_end: template.end_time,
          color: template.color || '#3B82F6', // Default blue
          overnight: template.overnight,
          grace_minutes: template.grace_minutes
        }, {
          onConflict: 'employee_code,work_date'
        })

      if (upsertError) throw upsertError

      return NextResponse.json({ success: true, message: 'Shift assigned successfully' })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error in schedule update API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}, { requiredPermission: 'schedule.edit' })
