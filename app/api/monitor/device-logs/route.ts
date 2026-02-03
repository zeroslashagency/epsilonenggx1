import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseAdminClient()
        const { searchParams } = new URL(request.url)

        const employeeCode = searchParams.get('employeeCode')
        const range = searchParams.get('range') || 'today' // 'today', '7d', '30d'

        // Calculate date range
        const now = new Date()
        const startDate = new Date()
        if (range === 'today') {
            startDate.setHours(0, 0, 0, 0)
        } else if (range === '7d') {
            startDate.setDate(now.getDate() - 7)
        } else if (range === '30d') {
            startDate.setDate(now.getDate() - 30)
        }

        // 1. Get all profiles first (to show everyone)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('employee_code, full_name')
            .not('employee_code', 'is', null)
            .order('full_name', { ascending: true })

        // 2. Get latest device activity for all users
        // strategies: get all unique employee_code from device_events
        const { data: deviceActivity } = await supabase
            .from('device_events')
            .select('employee_code, device_id, event_time')
            .order('event_time', { ascending: false })

        // Map latest activity per employee
        const activityMap = new Map<string, { device_id: string; last_active: string }>()
        deviceActivity?.forEach(event => {
            if (!activityMap.has(event.employee_code)) {
                activityMap.set(event.employee_code, {
                    device_id: event.device_id,
                    last_active: event.event_time
                })
            }
        })

        const employeesWithNames = profiles?.map(profile => {
            const activity = activityMap.get(profile.employee_code)
            const lastActive = activity?.last_active
            const isOnline = lastActive ? new Date(lastActive) > new Date(Date.now() - 15 * 60 * 1000) : false

            return {
                employee_code: profile.employee_code,
                employee_name: profile.full_name || `Employee ${profile.employee_code}`,
                device_id: activity?.device_id || null,
                last_active: lastActive || null,
                isOnline: isOnline,
                hasDevice: !!activity
            }
        }) || []

        // Sort: Online first, then by name
        employeesWithNames.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1
            if (!a.isOnline && b.isOnline) return 1
            return a.employee_name.localeCompare(b.employee_name)
        })

        // Create profile map for quick lookups
        const profileMap = new Map(profiles?.map(p => [p.employee_code, p.full_name]) || [])

        // 3. Get device events
        let eventsQuery = supabase
            .from('device_events')
            .select('*')
            .gte('event_time', startDate.toISOString())
            .order('event_time', { ascending: false })
            .limit(100)

        if (employeeCode) {
            eventsQuery = eventsQuery.eq('employee_code', employeeCode)
        }

        const { data: eventsData, error: eventsError } = await eventsQuery

        if (eventsError) throw eventsError

        // 4. Get storage logs
        let storageQuery = supabase
            .from('storage_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30)

        if (employeeCode) {
            storageQuery = storageQuery.eq('employee_code', employeeCode)
        }

        const { data: storageData } = await storageQuery

        // 5. Calculate analytics
        const activeDevicesCount = employeesWithNames.filter(e => e.isOnline).length
        const totalEvents = eventsData?.length || 0

        // Count by event type
        const eventTypeCounts: Record<string, number> = {}
        eventsData?.forEach(event => {
            eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1
        })

        const eventTypeBreakdown = Object.entries(eventTypeCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // Hourly activity heatmap (last 24 hours)
        const hourlyActivity: Record<number, number> = {}
        for (let i = 0; i < 24; i++) hourlyActivity[i] = 0

        eventsData?.forEach(event => {
            const hour = new Date(event.event_time).getHours()
            hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1
        })

        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: hourlyActivity[i] || 0
        }))

        // Storage trend
        const storageTrend = storageData?.map(s => ({
            date: s.log_date,
            used: s.used_bytes,
            total: s.total_bytes,
            free: s.free_bytes
        })) || []

        // Format recent events with employee names
        const recentEvents = eventsData?.slice(0, 50).map(event => ({
            ...event,
            employee_name: profileMap.get(event.employee_code) || `Employee ${event.employee_code}`
        })) || []

        return NextResponse.json({
            success: true,
            data: {
                employees: employeesWithNames,
                overview: {
                    activeDevicesCount,
                    totalEventsToday: totalEvents,
                    totalEmployees: employeesWithNames.length,
                    uniqueDevices: new Set(employeesWithNames.filter(e => e.device_id).map(e => e.device_id)).size
                },
                charts: {
                    eventTypeBreakdown,
                    hourlyActivity: hourlyData,
                    storageTrend
                },
                recentEvents
            }
        })

    } catch (error) {
        console.error('Device Logs API Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch device logs' },
            { status: 500 }
        )
    }
}
