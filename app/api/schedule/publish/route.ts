import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

/**
 * POST /api/schedule/publish
 * Publish a schedule (requires schedule.approve permission)
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.approve')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { scheduleId, scheduleName, publishDate, schedulingResults } = body

    if (!schedulingResults || !Array.isArray(schedulingResults)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduling results data' },
        { status: 400 }
      )
    }

    // Store published schedule in database
    const { data: publishedSchedule, error: publishError } = await supabase
      .from('published_schedules')
      .insert({
        schedule_id: scheduleId || `schedule_${Date.now()}`,
        schedule_name: scheduleName || `Schedule ${new Date().toLocaleDateString()}`,
        published_by: user.id,
        published_at: publishDate || new Date().toISOString(),
        schedule_data: schedulingResults,
        status: 'published'
      })
      .select()
      .single()

    if (publishError) {
      console.error('Error publishing schedule:', publishError)
      return NextResponse.json(
        { success: false, error: 'Failed to publish schedule', details: publishError.message },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'schedule_published',
      target_id: publishedSchedule?.id,
      meta_json: {
        schedule_id: scheduleId,
        schedule_name: scheduleName,
        published_at: publishDate || new Date().toISOString(),
        records_count: schedulingResults.length
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule published successfully',
      data: publishedSchedule
    })
  } catch (error: any) {
    console.error('Error in publish schedule API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/schedule/publish
 * Get all published schedules
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'schedule.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: schedules, error } = await supabase
      .from('published_schedules')
      .select(`
        *,
        publisher:profiles!published_schedules_published_by_fkey(full_name, email)
      `)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching published schedules:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch published schedules' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: schedules || [],
      count: schedules?.length || 0
    })
  } catch (error: any) {
    console.error('Error in get published schedules API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
