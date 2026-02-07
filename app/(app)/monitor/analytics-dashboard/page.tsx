"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Calendar, ArrowLeft, BarChart3, Activity, HardDrive, Clock, TrendingUp, Users, Smartphone, AlertCircle } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { EmployeeSidebar } from '../device-logs/EmployeeSidebar'
import { SectionToggle } from '../device-logs/SectionToggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { KpiCard, EmptyState } from '../components/monitor-cards'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import { cn } from '@/lib/utils'

const intervalOptions = [
    { value: '15s', label: '15s', ms: 15000 },
    { value: '30s', label: '30s', ms: 30000 },
    { value: '60s', label: '60s', ms: 60000 },
    { value: '5m', label: '5m', ms: 300000 },
]

function AnalyticsDashboardPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState('today')
    const [liveMode, setLiveMode] = useState(false)
    const [liveInterval, setLiveInterval] = useState('30s')
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [isPageVisible, setIsPageVisible] = useState(true)
    const fetchInFlight = useRef(false)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

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
                    setError('Unable to load analytics data.')
                }
            } catch (fetchError) {
                console.error('Failed to fetch device logs', fetchError)
                setError('Unable to load analytics data.')
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

    const { charts, overview, employees } = data || {}
    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4']

    const onlineEmployees = employees?.filter((employee: any) => employee.isOnline).length || 0
    const offlineEmployees = (employees?.length || 0) - onlineEmployees

    const onlineStatusData = [
        { name: 'Online', value: onlineEmployees, fill: '#10B981' },
        { name: 'Offline', value: offlineEmployees, fill: '#64748B' },
    ]

    const peakHour = useMemo(() => {
        if (!charts?.hourlyActivity?.length) return null
        return charts.hourlyActivity.reduce((max: any, entry: any) => (entry.count > max.count ? entry : max))
    }, [charts?.hourlyActivity])

    const topEvent = useMemo(() => {
        if (!charts?.eventTypeBreakdown?.length) return null
        return charts.eventTypeBreakdown.reduce((max: any, entry: any) => (entry.value > max.value ? entry : max))
    }, [charts?.eventTypeBreakdown])

    const latestStorage = useMemo(() => {
        if (!charts?.storageTrend?.length) return null
        return charts.storageTrend[charts.storageTrend.length - 1]
    }, [charts?.storageTrend])

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const formatEventName = (name: string): string => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    return (
        <>
            <PageBreadcrumbs items={[
                { label: 'Monitor' },
                { label: 'Device Logs', href: '/monitor/device-logs' },
                { label: 'Analytics Dashboard' },
            ]} />

            <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
                <Card className="relative overflow-hidden border-slate-200/70 bg-gradient-to-br from-white via-violet-50/40 to-slate-50 shadow-sm dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950">
                    <div className="absolute -right-14 -top-20 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
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
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                                            <BarChart3 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Analytics Dashboard</h1>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Device activity insights and trends</p>
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
                                            <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
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
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">Time window</span>
                            </div>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="h-9 w-full md:w-[180px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="static lg:sticky lg:top-8 h-fit self-start">
                        <EmployeeSidebar
                            employees={employees || []}
                            selectedEmployee={selectedEmployee}
                            onSelectEmployee={setSelectedEmployee}
                        />
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard
                                icon={<Activity className="h-5 w-5" />}
                                label="Total Events"
                                value={overview?.totalEventsToday || 0}
                                tone="violet"
                                helper="Today"
                            />
                            <KpiCard
                                icon={<Users className="h-5 w-5" />}
                                label="Online Now"
                                value={onlineEmployees}
                                tone="emerald"
                                helper={`${employees?.length || 0} employees`}
                            />
                            <KpiCard
                                icon={<Smartphone className="h-5 w-5" />}
                                label="Active Devices"
                                value={overview?.activeDevicesCount || 0}
                                tone="blue"
                            />
                            <KpiCard
                                icon={<HardDrive className="h-5 w-5" />}
                                label="Unique Devices"
                                value={overview?.uniqueDevices || 0}
                                tone="amber"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InsightCard
                                label="Peak Hour"
                                value={peakHour ? `${peakHour.hour}:00` : '—'}
                                helper={peakHour ? `${peakHour.count} events` : 'No data'}
                                icon={<TrendingUp className="h-4 w-4" />}
                                tone="violet"
                            />
                            <InsightCard
                                label="Top Event"
                                value={topEvent ? formatEventName(topEvent.name) : '—'}
                                helper={topEvent ? `${topEvent.value} events` : 'No data'}
                                icon={<Activity className="h-4 w-4" />}
                                tone="blue"
                            />
                            <InsightCard
                                label="Latest Storage"
                                value={latestStorage ? formatBytes(latestStorage.used) : '—'}
                                helper={latestStorage ? latestStorage.date : 'No data'}
                                icon={<HardDrive className="h-4 w-4" />}
                                tone="emerald"
                            />
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
                            </div>
                        ) : error ? (
                            <EmptyState
                                icon={<AlertCircle className="h-8 w-8" />}
                                title="Unable to load analytics"
                                description={error}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card className="border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
                                        <CardHeader className="border-b border-slate-200/70 dark:border-slate-800/80">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                                                    <Activity className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm text-slate-900 dark:text-white">Event Type Distribution</CardTitle>
                                                    <CardDescription>Share of event categories</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-64">
                                            {charts?.eventTypeBreakdown?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={charts.eventTypeBreakdown}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={90}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                            label={({ name, percent }) => `${formatEventName(name)} (${(percent * 100).toFixed(0)}%)`}
                                                        >
                                                            {charts.eventTypeBreakdown.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#0f172a' : '#fff',
                                                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                                                borderRadius: '10px',
                                                            }}
                                                        />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyState
                                                    icon={<Activity className="h-8 w-8" />}
                                                    title="No event data"
                                                    description="Try a longer time window."
                                                />
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
                                        <CardHeader className="border-b border-slate-200/70 dark:border-slate-800/80">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm text-slate-900 dark:text-white">Employee Status</CardTitle>
                                                    <CardDescription>Online vs offline employees</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={onlineStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                                        {onlineStatusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 lg:col-span-2">
                                        <CardHeader className="border-b border-slate-200/70 dark:border-slate-800/80">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                                                    <Clock className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm text-slate-900 dark:text-white">Hourly Activity</CardTitle>
                                                    <CardDescription>Last 24 hours</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-64">
                                            {charts?.hourlyActivity?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={charts.hourlyActivity}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                                        <XAxis dataKey="hour" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} tickFormatter={(hour) => `${hour}:00`} />
                                                        <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#0f172a' : '#fff',
                                                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                                                borderRadius: '10px',
                                                            }}
                                                            formatter={(value: number) => [`${value} events`, 'Count']}
                                                            labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                                                        />
                                                        <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyState
                                                    icon={<Clock className="h-8 w-8" />}
                                                    title="No hourly data"
                                                    description="Activity will appear after events are logged."
                                                />
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 lg:col-span-2">
                                        <CardHeader className="border-b border-slate-200/70 dark:border-slate-800/80">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                                                    <HardDrive className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm text-slate-900 dark:text-white">Storage Usage Trend</CardTitle>
                                                    <CardDescription>Device storage consumption</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-56">
                                            {charts?.storageTrend?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={charts.storageTrend}>
                                                        <defs>
                                                            <linearGradient id="storageTrend" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                                        <XAxis dataKey="date" tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} />
                                                        <YAxis tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }} tickFormatter={(val) => formatBytes(val)} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#0f172a' : '#fff',
                                                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                                                borderRadius: '10px',
                                                            }}
                                                            formatter={(value: number) => [formatBytes(value), 'Used']}
                                                        />
                                                        <Area type="monotone" dataKey="used" stroke="#10B981" fillOpacity={1} fill="url(#storageTrend)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyState
                                                    icon={<HardDrive className="h-8 w-8" />}
                                                    title="No storage data"
                                                    description="Storage usage will appear when devices report metrics."
                                                />
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

function InsightCard({
    label,
    value,
    helper,
    icon,
    tone,
}: {
    label: string
    value: string
    helper?: string
    icon: React.ReactNode
    tone: 'violet' | 'blue' | 'emerald'
}) {
    const toneStyles = {
        violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    }

    return (
        <Card className="border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
            <CardContent className="flex items-start gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', toneStyles[tone])}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
                    {helper && <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
                </div>
            </CardContent>
        </Card>
    )
}

export default function ProtectedAnalyticsDashboardPage() {
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
            <AnalyticsDashboardPage />
        </ProtectedPage>
    )
}
