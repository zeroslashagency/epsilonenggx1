"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Calendar, ArrowLeft, Activity, Smartphone, Clock, Monitor, Search, AlertCircle } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { EmployeeSidebar } from '../device-logs/EmployeeSidebar'
import { SectionToggle } from '../device-logs/SectionToggle'
import { FeedCard } from './FeedCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard, EmptyState } from '../components/monitor-cards'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface RecentEvent {
    id: number
    employee_code: string
    employee_name: string
    device_id: string
    event_type: string
    event_time: string
    metadata?: any
}

const intervalOptions = [
    { value: '15s', label: '15s', ms: 15000 },
    { value: '30s', label: '30s', ms: 30000 },
    { value: '60s', label: '60s', ms: 60000 },
    { value: '5m', label: '5m', ms: 300000 },
]

const eventTypeOptions = [
    { value: 'all', label: 'All events' },
    { value: 'screen_on', label: 'Screen On' },
    { value: 'screen_off', label: 'Screen Off' },
    { value: 'boot', label: 'Device Boot' },
    { value: 'shutdown', label: 'Shut Down' },
]

const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'online', label: 'Online only' },
    { value: 'offline', label: 'Offline only' },
]

function ActivityFeedPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState('today')
    const [searchQuery, setSearchQuery] = useState('')
    const [eventType, setEventType] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [liveMode, setLiveMode] = useState(false)
    const [liveInterval, setLiveInterval] = useState('30s')
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [isPageVisible, setIsPageVisible] = useState(true)
    const fetchInFlight = useRef(false)

    useEffect(() => {
        const handleVisibility = () => setIsPageVisible(!document.hidden)
        handleVisibility()
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    const fetchLogs = useCallback(
        async ({ silent = false }: { silent?: boolean } = {}) => {
            if (fetchInFlight.current) return
            fetchInFlight.current = true
            if (silent) {
                setIsRefreshing(true)
            } else {
                setLoading(true)
            }
            setError(null)

            try {
                const params = new URLSearchParams()
                params.append('range', dateRange)
                if (selectedEmployee) {
                    params.append('employeeCode', selectedEmployee)
                }
                const result = await apiGet(`/api/monitor/device-logs?${params.toString()}`)
                if (result?.success) {
                    setData(result.data)
                    setLastUpdated(new Date())
                } else {
                    setError('Unable to load activity feed.')
                }
            } catch (fetchError) {
                console.error('Failed to fetch device logs', fetchError)
                setError('Unable to load activity feed.')
            } finally {
                if (silent) {
                    setIsRefreshing(false)
                } else {
                    setLoading(false)
                }
                fetchInFlight.current = false
            }
        },
        [dateRange, selectedEmployee]
    )

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const intervalMs = intervalOptions.find((option) => option.value === liveInterval)?.ms ?? 30000

    useEffect(() => {
        if (!liveMode || !isPageVisible) return
        fetchLogs({ silent: true })
        const intervalId = window.setInterval(() => {
            fetchLogs({ silent: true })
        }, intervalMs)
        return () => window.clearInterval(intervalId)
    }, [fetchLogs, intervalMs, liveMode, isPageVisible])

    const events: RecentEvent[] = data?.recentEvents || []
    const employees = data?.employees || []
    const stats = data?.overview || { activeDevicesCount: 0, totalEventsToday: 0, totalEmployees: 0, uniqueDevices: 0 }
    const selectedEmployeeName = useMemo(() => {
        if (!selectedEmployee) return null
        return employees.find((employee: any) => employee.employee_code === selectedEmployee)?.employee_name || null
    }, [employees, selectedEmployee])

    const employeeStatusMap = useMemo(() => {
        return new Map(employees.map((employee: any) => [employee.employee_code, employee.isOnline]))
    }, [employees])

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            if (eventType !== 'all' && event.event_type !== eventType) return false
            if (statusFilter !== 'all') {
                const status = employeeStatusMap.get(event.employee_code)
                const isOnline = status ?? event.event_type === 'screen_on'
                if (statusFilter === 'online' && !isOnline) return false
                if (statusFilter === 'offline' && isOnline) return false
            }
            if (searchQuery.trim()) {
                const needle = searchQuery.trim().toLowerCase()
                const haystack = [
                    event.employee_name,
                    event.employee_code,
                    event.device_id,
                    event.event_type,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!haystack.includes(needle)) return false
            }
            return true
        })
    }, [employeeStatusMap, eventType, events, searchQuery, statusFilter])

    const onlineCount = employees.filter((employee: any) => employee.isOnline).length
    const hasFilters = Boolean(searchQuery.trim()) || eventType !== 'all' || statusFilter !== 'all'
    const eventTypeLabel = eventTypeOptions.find((option) => option.value === eventType)?.label || eventType
    const statusLabel = statusOptions.find((option) => option.value === statusFilter)?.label || statusFilter

    const clearFilters = () => {
        setSearchQuery('')
        setEventType('all')
        setStatusFilter('all')
    }

    return (
        <>
            <PageBreadcrumbs items={[
                { label: 'Monitor' },
                { label: 'Device Logs', href: '/monitor/device-logs' },
                { label: 'Activity Feed' },
            ]} />

            <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
                <Card className="relative overflow-hidden border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 shadow-sm dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950">
                    <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                    <CardContent className="relative">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <Button variant="ghost" size="icon" className="rounded-2xl" asChild>
                                    <Link href="/monitor/device-logs">
                                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    </Link>
                                </Button>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                                            <Activity className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Activity Feed</h1>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Real-time device events stream
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <Badge
                                            className={cn(
                                                'border',
                                                liveMode
                                                    ? 'border-emerald-200/60 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                    : 'border-slate-200/60 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300'
                                            )}
                                        >
                                            {liveMode ? 'Live' : 'Paused'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                                Last updated {lastUpdated ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </span>
                                        </div>
                                        {isRefreshing && (
                                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                Syncing
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300">
                                    <Switch checked={liveMode} onCheckedChange={setLiveMode} />
                                    Live updates
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={liveInterval} onValueChange={setLiveInterval}>
                                        <SelectTrigger className="h-9 w-[90px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {intervalOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchLogs()}
                                        disabled={loading}
                                        className="gap-2"
                                    >
                                        <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <SectionToggle />

                <Card className="border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                    <CardContent>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Search employee, device, or event"
                                        className="h-9 border-slate-200 bg-white pl-9 text-sm dark:border-slate-800 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <Select value={dateRange} onValueChange={setDateRange}>
                                        <SelectTrigger className="h-9 w-full border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="7d">Last 7 Days</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger className="h-9 w-full border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                        <SelectValue placeholder="Event type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventTypeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9 w-full border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {hasFilters && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                {searchQuery.trim() && (
                                    <Badge className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                                        Search: {searchQuery.trim()}
                                    </Badge>
                                )}
                                {eventType !== 'all' && (
                                    <Badge className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                                        Event: {eventTypeLabel}
                                    </Badge>
                                )}
                                {statusFilter !== 'all' && (
                                    <Badge className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                                        Status: {statusLabel}
                                    </Badge>
                                )}
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                                    Clear filters
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="static lg:sticky lg:top-8 h-fit self-start">
                        <EmployeeSidebar
                            employees={employees}
                            selectedEmployee={selectedEmployee}
                            onSelectEmployee={setSelectedEmployee}
                        />
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard
                                icon={<Smartphone className="h-5 w-5" />}
                                label="Active Devices"
                                value={stats.activeDevicesCount}
                                tone="blue"
                            />
                            <KpiCard
                                icon={<Activity className="h-5 w-5" />}
                                label="Total Events"
                                value={stats.totalEventsToday}
                                tone="violet"
                                helper={hasFilters ? `${filteredEvents.length} matching filters` : 'Today'}
                            />
                            <KpiCard
                                icon={<Monitor className="h-5 w-5" />}
                                label="Online"
                                value={onlineCount}
                                tone="emerald"
                                helper={`${employees.length} employees`}
                            />
                            <KpiCard
                                icon={<Clock className="h-5 w-5" />}
                                label="Unique Devices"
                                value={stats.uniqueDevices}
                                tone="amber"
                            />
                        </div>

                        <Card className="overflow-hidden border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
                            <CardHeader className="border-b border-slate-200/70 dark:border-slate-800/80">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={cn(
                                            'h-2.5 w-2.5 rounded-full',
                                            liveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                                        )}
                                    />
                                    <CardTitle className="text-base text-slate-900 dark:text-white">Activity Stream</CardTitle>
                                </div>
                                <CardDescription>
                                    {filteredEvents.length} events {selectedEmployee ? `for ${selectedEmployeeName || selectedEmployee}` : 'total'}
                                </CardDescription>
                                <CardAction className="flex items-center gap-2">
                                    {hasFilters && (
                                        <Badge className="border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                                            Filtered
                                        </Badge>
                                    )}
                                    {liveMode && (
                                        <Badge className="border-emerald-200/60 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                                            Live
                                        </Badge>
                                    )}
                                </CardAction>
                            </CardHeader>
                            <CardContent className="px-0">
                                {loading ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <div key={index} className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-2xl" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-1/3" />
                                                        <Skeleton className="h-3 w-1/4" />
                                                    </div>
                                                    <Skeleton className="h-6 w-24" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : error ? (
                                    <EmptyState
                                        icon={<AlertCircle className="h-8 w-8" />}
                                        title="Unable to load activity"
                                        description={error}
                                    />
                                ) : filteredEvents.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredEvents.map((event: RecentEvent) => (
                                            <FeedCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<Activity className="h-8 w-8" />}
                                        title="No activity recorded"
                                        description={hasFilters ? 'Try adjusting filters to see more events.' : 'Events will appear here in real-time.'}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    )
}

export default function ProtectedActivityFeedPage() {
    return (
        <ProtectedPage
            module="web_user_attendance"
            item="Device Monitoring: Overview"
            permission="view"
            anyOf={[
                { module: 'web_user_attendance', item: 'Device Monitoring: Screen Time', permission: 'view' },
                { module: 'web_user_attendance', item: 'Device Monitoring: App Usage', permission: 'view' },
                { module: 'web_user_attendance', item: 'Device Monitoring: Network', permission: 'view' },
                { module: 'web_user_attendance', item: 'Device Monitoring: Storage', permission: 'view' },
                { module: 'web_user_attendance', item: 'Device Monitoring: Events', permission: 'view' },
                { module: 'web_user_attendance', item: 'Device Monitoring: Bluetooth', permission: 'view' }
            ]}
        >
            <ActivityFeedPage />
        </ProtectedPage>
    )
}
