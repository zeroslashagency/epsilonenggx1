import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/schedule/regenerate
 * Maintenance endpoint to regenerate daily schedules from current assignments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('start') || new Date().toISOString().split('T')[0]
    const days = parseInt(searchParams.get('days') || '30')

    const start = new Date(startDateParam)
    const end = new Date(start)
    end.setDate(end.getDate() + days)

    console.log(`[Regen] Starting regeneration from ${start.toISOString()} to ${end.toISOString()}`)

    // 1. Fetch all active assignments overlapping the window
    const { data: assignments, error: assignError } = await supabase
      .from('employee_shift_assignments')
      .select(`
        *,
        shift_template:shift_templates(*)
      `)
      .or(`end_date.is.null,end_date.gte.${startDateParam}`)
    
    if (assignError) throw assignError

    console.log(`[Regen] Found ${assignments?.length} active assignments`)

    // Use a Map to deduplicate records (Last assignment wins)
    const dailyRecordsMap = new Map<string, any>()

    // 2. Process each assignment
    // Sort assignments by created_at so newer ones overwrite older ones
    const sortedAssignments = (assignments || []).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    for (const assignment of sortedAssignments) {
      // Prepare rotation metadata
      let rotationPattern: any[] = []
      let rotationWeeks = 1
      let rotationShiftMap = new Map<string, any>()
      
      const template = assignment.shift_template

      if (assignment.assignment_type === 'rotation' && template && template.pattern) {
        rotationPattern = Array.isArray(template.pattern) ? template.pattern : []
        rotationWeeks = template.weeks_pattern || rotationPattern.length || 1
        
        const shiftNames = Array.from(new Set(
          rotationPattern.map((p: any) => p?.shift_name).filter((n: any) => !!n)
        )) as string[]

        if (shiftNames.length > 0) {
           const { data: baseShifts } = await supabase
            .from('shift_templates')
            .select('*')
            .in('name', shiftNames)
          
           if (baseShifts) {
             rotationShiftMap = new Map(baseShifts.map(s => [s.name, s]))
           }
        }
      }

      // Generate days
      const current = new Date(start < new Date(assignment.start_date) ? assignment.start_date : start)
      const assignEnd = assignment.end_date ? new Date(assignment.end_date) : end
      const last = end < assignEnd ? end : assignEnd

      for (let d = new Date(current); d <= last; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          
          let shiftName = template.name
          let shiftStart = template.start_time
          let shiftEnd = template.end_time
          let color = template.color
          let overnight = template.overnight
          let graceMinutes = template.grace_minutes

          if (assignment.assignment_type === 'rotation' && rotationPattern.length > 0) {
            // Apply Rotation Logic
            const assignStartDate = new Date(assignment.start_date)
            const daysDiff = Math.floor((d.getTime() - assignStartDate.getTime()) / (1000 * 60 * 60 * 24))
            const weekIndex = Math.floor(daysDiff / 7) % rotationWeeks
            const weekPattern = rotationPattern[weekIndex]
            
            if (weekPattern?.shift_name) {
              const baseShift = rotationShiftMap.get(weekPattern.shift_name)
              if (baseShift) {
                shiftName = baseShift.name
                shiftStart = baseShift.start_time
                shiftEnd = baseShift.end_time
                color = baseShift.color
                overnight = baseShift.overnight
                graceMinutes = baseShift.grace_minutes
              } 
            }
          }

          const record = {
            employee_code: assignment.employee_code,
            work_date: dateStr,
            shift_name: shiftName,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            color: color,
            overnight: overnight,
            grace_minutes: graceMinutes
          }
          
          dailyRecordsMap.set(`${assignment.employee_code}_${dateStr}`, record)
      }
    }

    const dailyRecords = Array.from(dailyRecordsMap.values())
    console.log(`[Regen] Generated ${dailyRecords.length} unique daily records`)

    // 3. Batch Insert
    if (dailyRecords.length > 0) {
      // Split into chunks if too large (Supabase limit)
      const chunkSize = 1000
      for (let i = 0; i < dailyRecords.length; i += chunkSize) {
        const chunk = dailyRecords.slice(i, i + chunkSize)
        const { error: upsertError } = await supabase
          .from('employee_daily_schedule')
          .upsert(chunk, { onConflict: 'employee_code,work_date' })
        
        if (upsertError) {
          console.error('[Regen] Error upserting chunk:', upsertError)
          throw upsertError
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: dailyRecords.length,
      assignments_processed: assignments?.length 
    })

  } catch (error: any) {
    console.error('[Regen] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
