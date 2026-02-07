import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseAdminClient()
        const { searchParams } = new URL(request.url)

        // Pagination params
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = (page - 1) * limit

        // Filter params
        const type_filter = searchParams.get('type') // 'incoming', 'outgoing', 'missed'
        const search = searchParams.get('search')
        const userId = searchParams.get('userId')

        // Base query
        let query = supabase
            .from('call_recordings')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (userId) {
            query = query.eq('user_id', userId)
        }

        // Apply filters
        if (type_filter && type_filter !== 'all') {
            // The DB column is 'direction' for incoming/outgoing, but 'call_type' can be 'missed'?
            // Based on sample data: call_type='missed' is in `call_type` col, direction is 'incoming'.
            // If filter is 'missed', usually checking call_type. 
            // If incoming/outgoing, checking direction.

            if (type_filter === 'missed') {
                query = query.eq('call_type', 'missed')
            } else {
                query = query.eq('direction', type_filter)
            }
        }

        if (search) {
            query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`)
        }

        // Execute query with pagination
        const { data: logs, count, error } = await query.range(offset, offset + limit - 1)

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }

        // Transform logs to include public URL for audio
        const enrichedLogs = logs?.map(log => {
            let publicUrl = null
            if (log.file_url) {
                // file_url might be just the filename or path. 
                // Bucket is 'call-recordings'.
                // Check if file_url is full URL or relative path. 
                // Assuming path based on task description.
                // If file_url starts with http, use it, else construct.
                if (log.file_url.startsWith('http')) {
                    publicUrl = log.file_url
                } else {
                    // Using getPublicUrl is safer but requires valid bucket
                    const { data } = supabase.storage.from('call-recordings').getPublicUrl(log.file_url)
                    publicUrl = data.publicUrl
                }
            }
            return {
                ...log,
                // Ensure duration is number
                duration: log.duration_seconds,
                // Map DB fields to Type if needed, but Type now matches DB mostly
                audio_url: publicUrl
            }
        })

        // Calculate Stats (This is expensive to do on every request for total count, 
        // maybe optimized in future or separate endpoint, but for now exact query)
        // We'll do a quick separate aggregation if needed, or just return counts if filtered.
        // For specific "Total Stats", we might need a separate query without filters. 
        // Let's do a quick consolidated stats query.

        // Optimization: separate stats query only if page=1 or requested? 
        // For now, let's keep it simple and just run aggregate queries for the stats cards.
        // NOTE: This might be slow on large tables.

        let totalCallsQuery = supabase.from('call_recordings').select('*', { count: 'exact', head: true })
        let incomingQuery = supabase.from('call_recordings').select('*', { count: 'exact', head: true }).eq('direction', 'incoming')
        let outgoingQuery = supabase.from('call_recordings').select('*', { count: 'exact', head: true }).eq('direction', 'outgoing')
        let missedQuery = supabase.from('call_recordings').select('*', { count: 'exact', head: true }).eq('call_type', 'missed')

        if (userId) {
            totalCallsQuery = totalCallsQuery.eq('user_id', userId)
            incomingQuery = incomingQuery.eq('user_id', userId)
            outgoingQuery = outgoingQuery.eq('user_id', userId)
            missedQuery = missedQuery.eq('user_id', userId)
        }

        const { count: totalCalls } = await totalCallsQuery
        const { count: incoming } = await incomingQuery
        const { count: outgoing } = await outgoingQuery
        const { count: missed } = await missedQuery

        let totalDurationMinutes = 0
        const { data: totalDurationSeconds, error: durationError } = await supabase.rpc('call_recordings_total_duration', userId ? { user_uuid: userId } : undefined)
        if (durationError) {
            console.error('Supabase RPC error:', durationError)
        } else if (typeof totalDurationSeconds === 'number' || typeof totalDurationSeconds === 'string') {
            const durationValue = typeof totalDurationSeconds === 'string' ? parseInt(totalDurationSeconds, 10) : totalDurationSeconds
            totalDurationMinutes = Math.round(durationValue / 60)
        }

        const stats = {
            totalCalls: totalCalls || 0,
            incoming: incoming || 0,
            outgoing: outgoing || 0,
            missed: missed || 0,
            totalDuration: totalDurationMinutes
        }

        return NextResponse.json({
            success: true,
            logs: enrichedLogs,
            stats,
            pagination: {
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                currentPage: page,
                pageSize: limit
            }
        })

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch call logs' },
            { status: 500 }
        )
    }
}
