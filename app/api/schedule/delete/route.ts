import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

/**
 * DELETE /api/schedule/delete
 * Delete a schedule (requires schedule.delete permission)
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.delete')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('id')

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Check if schedule is published (prevent deletion of published schedules)
    const { data: schedule, error: fetchError } = await supabase
      .from('published_schedules')
      .select('status')
      .eq('schedule_id', scheduleId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking schedule status:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to check schedule status' },
        { status: 500 }
      )
    }

    if (schedule && schedule.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete published schedules. Unpublish first.' },
        { status: 403 }
      )
    }

    // Soft delete: mark as deleted instead of removing from database
    const { error: deleteError } = await supabase
      .from('scheduling_outputs')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('schedule_id', scheduleId)

    if (deleteError) {
      console.error('Error deleting schedule:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete schedule', details: deleteError.message },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'schedule_deleted',
      target_id: scheduleId,
      meta_json: {
        schedule_id: scheduleId,
        deleted_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in delete schedule API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/schedule/delete
 * Restore a deleted schedule
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.delete')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { scheduleId } = body

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Restore schedule
    const { error: restoreError } = await supabase
      .from('scheduling_outputs')
      .update({ deleted_at: null, deleted_by: null })
      .eq('schedule_id', scheduleId)

    if (restoreError) {
      console.error('Error restoring schedule:', restoreError)
      return NextResponse.json(
        { success: false, error: 'Failed to restore schedule' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'schedule_restored',
      target_id: scheduleId,
      meta_json: {
        schedule_id: scheduleId,
        restored_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule restored successfully'
    })
  } catch (error: any) {
    console.error('Error in restore schedule API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
