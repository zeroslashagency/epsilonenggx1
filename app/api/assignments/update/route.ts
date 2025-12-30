export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { withAuth } from '@/app/lib/api-wrapper'

/**
 * POST /api/assignments/update
 * Updates a single employee's persistent shift assignment
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

    const startDate = work_date

    // Strategy for persistent assignment:
    // 1. Close/Delete overlapping assignments starting from this date
    
    // Step 1: Delete ALL future assignments for this employee that start on or after the new Start Date
    const { error: deleteError } = await supabase
      .from('employee_shift_assignments')
      .delete()
      .eq('employee_code', employee_code)
      .gte('start_date', startDate)
    
    if (deleteError) throw deleteError

    // Step 2: Close active assignment ending on (StartDate - 1 Day)
    const yesterday = new Date(new Date(startDate).setDate(new Date(startDate).getDate() - 1)).toISOString().split('T')[0]
    
    const { data: assignmentsToClose } = await supabase
      .from('employee_shift_assignments')
      .select('id')
      .eq('employee_code', employee_code)
      .lt('start_date', startDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`)
    
    if (assignmentsToClose && assignmentsToClose.length > 0) {
        const idsToClose = assignmentsToClose.map(a => a.id);
        const { error: closeError } = await supabase
          .from('employee_shift_assignments')
          .update({ end_date: yesterday })
          .in('id', idsToClose)
        
        if (closeError) throw closeError
    }

    if (action === 'unassign') {
      // Also clear daily schedule from this date forward to be safe
      await supabase
        .from('employee_daily_schedule')
        .delete()
        .eq('employee_code', employee_code)
        .gte('work_date', startDate)

      return NextResponse.json({ success: true, message: 'Shift unassigned persistently' })
    }

    if (action === 'assign') {
      if (!shift_id) {
        return NextResponse.json(
          { success: false, error: 'shift_id is required' },
          { status: 400 }
        )
      }

      // Create new persistent assignment
      const { error: insertError } = await supabase
        .from('employee_shift_assignments')
        .insert({
          employee_code,
          assignment_type: 'fixed', // Default to fixed for board drops
          shift_template_id: shift_id,
          start_date: startDate,
          created_by: user.id
        })

      if (insertError) throw insertError

      // Fetch template details to generate daily records (syncing mechanism)
      const { data: template, error: templateError } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', shift_id)
        .single()

      if (template && !templateError) {
          // Generate 1 year of daily records to reflect the new assignment in calendars
          const dailyRecords: any[] = []
          const startStr = startDate
          const workDays = template.work_days || template.pattern?.work_days || [0, 1, 2, 3, 4, 5, 6]

          // Use UTC for consistent day iteration
          const startUTC = new Date(startStr + 'T00:00:00Z')
          const endUTC = new Date(startUTC.getTime() + 365 * 24 * 60 * 60 * 1000)

          for (let d = new Date(startUTC); d <= endUTC; d.setUTCDate(d.getUTCDate() + 1)) {
              if (!workDays.includes(d.getUTCDay())) continue
              
              dailyRecords.push({
                  employee_code,
                  work_date: d.toISOString().split('T')[0],
                  shift_id: template.id, // Ensure shift_id is persisted for reliable column matching
                  shift_name: template.name,
                  shift_start: template.start_time,
                  shift_end: template.end_time,
                  color: template.color,
                  overnight: template.overnight,
                  grace_minutes: template.grace_minutes
              })
          }

          if (dailyRecords.length > 0) {
              await supabase
                .from('employee_daily_schedule')
                .upsert(dailyRecords, { onConflict: 'employee_code,work_date' })
          }
      }

      return NextResponse.json({ success: true, message: 'Persistent shift assigned successfully' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Error in assignment update API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}, { requiredPermission: 'schedule.edit' })
