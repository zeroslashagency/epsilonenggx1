export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    const body = await request.json()
    const { schedulingResults } = body

    if (!schedulingResults || !Array.isArray(schedulingResults)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduling results data' },
        { status: 400 }
      )
    }

    // Clear existing scheduling results
    await supabase
      .from('scheduling_outputs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    // Store the exact scheduling results in the format you specified
    const formattedResults = schedulingResults.map((result: any) => ({
      part_number: result.partNumber || result.partnumber || result.part_number,
      order_qty: result.orderQty || result.order_quantity || result.order_qty,
      priority: result.priority,
      batch_id: result.batchId || result.batch_id,
      batch_qty: result.batchQty || result.batch_qty,
      operation_seq: result.operationSeq || result.operation_seq,
      operation_name: result.operationName || result.operation_name,
      machine: result.machine,
      person: result.person || result.operator,
      setup_start: result.setupStart || result.setup_start,
      setup_end: result.setupEnd || result.setup_end,
      run_start: result.runStart || result.run_start,
      run_end: result.runEnd || result.run_end,
      timing: result.timing,
      due_date: result.dueDate || result.due_date,
      status: result.status,
      created_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('scheduling_outputs')
      .insert(formattedResults)
      .select()

    if (error) {
      console.error('Error storing scheduling results:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store scheduling results', details: error },
        { status: 500 }
      )
    }

    console.log('Scheduling results stored successfully:', formattedResults.length, 'records')
    
    return NextResponse.json({
      success: true,
      message: 'Scheduling results stored successfully',
      recordsCount: formattedResults.length,
      data: formattedResults
    })

  } catch (error) {
    console.error('Error in store-scheduling-results API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    const { data, error } = await supabase
      .from('scheduling_outputs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scheduling results:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scheduling results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduling results fetched successfully',
      data: data || [],
      recordsCount: data?.length || 0
    })

  } catch (error) {
    console.error('Error in GET store-scheduling-results API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
