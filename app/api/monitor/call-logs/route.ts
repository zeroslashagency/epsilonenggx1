export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/monitor/call-logs
 * Lists call recordings (uploaded by the mobile app) with pagination, filters,
 * stats, and a signed/public audio URL per row.
 *
 * Schema: public.call_recordings
 *   id, user_id, phone_number, contact_name, direction ('incoming'|'outgoing'),
 *   call_type ('missed'|...), start_time, end_time, duration_seconds,
 *   file_url, upload_status, created_at, latitude, longitude, location_accuracy
 */
export async function GET(request: NextRequest) {
  // Auth: requires Calls view permission
  const authResult = await requirePermission(request, 'calls.calls.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit
    const typeFilter = searchParams.get('type')
    const search = searchParams.get('search')?.trim()
    const userId = searchParams.get('userId')

    let query = supabase
      .from('call_recordings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (userId) query = query.eq('user_id', userId)

    if (typeFilter && typeFilter !== 'all') {
      if (typeFilter === 'missed') {
        query = query.eq('call_type', 'missed')
      } else {
        query = query.eq('direction', typeFilter)
      }
    }

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1)
    if (error) {
      console.error('call-logs query error:', error.message)
      return NextResponse.json({ success: false, error: 'Failed to fetch call logs' }, { status: 500 })
    }

    // Resolve audio URL per row (signed URL for private bucket; fall back to as-is for absolute URLs)
    const rows = logs || []
    const enrichedLogs = await Promise.all(
      rows.map(async (log: any) => {
        let audioUrl: string | null = null
        if (log.file_url) {
          if (typeof log.file_url === 'string' && log.file_url.startsWith('http')) {
            audioUrl = log.file_url
          } else {
            const { data: signed } = await supabase.storage
              .from('call-recordings')
              .createSignedUrl(log.file_url, 60 * 60)
            audioUrl = signed?.signedUrl ?? null
          }
        }
        return { ...log, duration: log.duration_seconds ?? 0, audio_url: audioUrl }
      })
    )

    // Stats: derive from a single lightweight projection (no missing RPC dependency)
    let statsQuery = supabase
      .from('call_recordings')
      .select('direction, call_type, duration_seconds')
    if (userId) statsQuery = statsQuery.eq('user_id', userId)
    const { data: statRows } = await statsQuery

    const all = statRows || []
    const stats = {
      totalCalls: all.length,
      incoming: all.filter(r => r.direction === 'incoming').length,
      outgoing: all.filter(r => r.direction === 'outgoing').length,
      missed: all.filter(r => r.call_type === 'missed').length,
      totalDuration: Math.round(
        all.reduce((sum, r) => sum + (Number(r.duration_seconds) || 0), 0) / 60
      ),
    }

    return NextResponse.json({
      success: true,
      logs: enrichedLogs,
      stats,
      pagination: {
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        pageSize: limit,
      },
    })
  } catch (error) {
    console.error('call-logs API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch call logs' }, { status: 500 })
  }
}
