"use client"

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { Activity, HardDrive, Clock, Smartphone, Calendar, TrendingUp } from 'lucide-react'
import { useTheme } from 'next-themes'

interface DeviceAnalyticsProps {
    data: any
    loading: boolean
    selectedEmployee: string | null
}

export function DeviceAnalytics({ data, loading, selectedEmployee }: DeviceAnalyticsProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const { charts } = data || {}
    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899']

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
            <div className="w-full h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Analytics Title */}
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedEmployee ? `Analytics for Employee ${selectedEmployee}` : 'Overall Analytics'}
                </h2>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Type Breakdown (Pie) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        Event Type Distribution
                    </h3>
                    <div className="h-56">
                        {charts?.eventTypeBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.eventTypeBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={<Activity />} text="No event data" />
                        )}
                    </div>
                </div>

                {/* Hourly Activity Heatmap */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Hourly Activity (Last 24h)
                    </h3>
                    <div className="h-56">
                        {charts?.hourlyActivity?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.hourlyActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                    <XAxis
                                        dataKey="hour"
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                                        tickFormatter={(h) => `${h}:00`}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
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
                                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon={<Clock />} text="No hourly data" />
                        )}
                    </div>
                </div>

                {/* Storage Trend */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-emerald-500" />
                        Storage Usage Trend
                    </h3>
                    <div className="h-48">
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
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10 }}
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
                </div>
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
