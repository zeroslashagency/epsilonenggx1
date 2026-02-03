"use client"

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import { Activity, HardDrive, Clock, TrendingUp, RefreshCw, Users, Smartphone } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Card } from '@/components/ui/card'

interface AnalyticsDashboardViewProps {
    data: any
    loading: boolean
    selectedEmployee: string | null
}

export function AnalyticsDashboardView({ data, loading, selectedEmployee }: AnalyticsDashboardViewProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const { charts, overview, employees } = data || {}
    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4']

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    // Calculate additional analytics
    const onlineEmployees = employees?.filter((e: any) => e.isOnline).length || 0
    const offlineEmployees = (employees?.length || 0) - onlineEmployees

    const onlineStatusData = [
        { name: 'Online', value: onlineEmployees, fill: '#10B981' },
        { name: 'Offline', value: offlineEmployees, fill: '#64748B' }
    ]

    return (
        <div className="space-y-6">
            {/* Analytics Header */}
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedEmployee ? `Analytics for Employee ${selectedEmployee}` : 'Overall Analytics Dashboard'}
                </h2>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-5 w-5 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Total Events</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.totalEventsToday || 0}</p>
                </Card>
                <Card className="p-5 border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Online Now</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{onlineEmployees}</p>
                </Card>
                <Card className="p-5 border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-5 w-5 text-blue-500" />
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Active Devices</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.activeDevicesCount || 0}</p>
                </Card>
                <Card className="p-5 border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
                    <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="h-5 w-5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Unique Devices</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.uniqueDevices || 0}</p>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Type Breakdown (Pie) */}
                <Card className="p-5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        Event Type Distribution
                    </h3>
                    <div className="h-64">
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
                                            backgroundColor: isDark ? '#1E293B' : '#fff',
                                            borderColor: isDark ? '#334155' : '#e2e8f0',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={<Activity />} text="No event data" />
                        )}
                    </div>
                </Card>

                {/* Online/Offline Status */}
                <Card className="p-5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        Employee Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={onlineStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {onlineStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Hourly Activity Heatmap */}
                <Card className="p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Hourly Activity (Last 24h)
                    </h3>
                    <div className="h-64">
                        {charts?.hourlyActivity?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.hourlyActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                    <XAxis
                                        dataKey="hour"
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                        tickFormatter={(h) => `${h}:00`}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1E293B' : '#fff',
                                            borderColor: isDark ? '#334155' : '#e2e8f0',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: number) => [`${value} events`, 'Count']}
                                        labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                                    />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={<Clock />} text="No hourly data" />
                        )}
                    </div>
                </Card>

                {/* Storage Trend */}
                <Card className="p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-emerald-500" />
                        Storage Usage Trend
                    </h3>
                    <div className="h-56">
                        {charts?.storageTrend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.storageTrend}>
                                    <defs>
                                        <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                        tickFormatter={(val) => formatBytes(val)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1E293B' : '#fff',
                                            borderColor: isDark ? '#334155' : '#e2e8f0',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: number) => [formatBytes(value), 'Used']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="used"
                                        stroke="#10B981"
                                        fillOpacity={1}
                                        fill="url(#colorUsed)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={<HardDrive />} text="No storage data available" />
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="opacity-30 mb-2">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    )
}

function formatEventName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
