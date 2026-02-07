"use client"

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Calendar, Filter, ArrowUpRight, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Clock, CheckCircle2 } from 'lucide-react'
import { CallLog } from '@/app/types/call-log'
import { useTheme } from 'next-themes'

interface CallAnalyticsProps {
    logs: CallLog[]
    loading: boolean
}

export function CallAnalytics({ logs, loading }: CallAnalyticsProps) {
    const [tempFilters, setTempFilters] = useState({
        dateRange: '7d',
        inbound: true,
        outbound: true,
        missed: true
    })
    const [activeFilters, setActiveFilters] = useState({
        dateRange: '7d',
        inbound: true,
        outbound: true,
        missed: true
    })
    const { theme } = useTheme()

    const handleApplyFilters = () => {
        setActiveFilters(tempFilters)
    }

    const filteredLogs = useMemo(() => {
        const now = new Date()
        const past = new Date()
        if (activeFilters.dateRange === '30d') past.setDate(now.getDate() - 30)
        else if (activeFilters.dateRange === '90d') past.setDate(now.getDate() - 90)
        else past.setDate(now.getDate() - 7)

        return logs.filter(log => {
            const logDate = new Date(log.created_at)
            const dateMatch = logDate >= past && logDate <= now

            const isMissed = log.call_type === 'missed'
            const isIncoming = log.direction === 'incoming' && !isMissed
            const isOutgoing = log.direction === 'outgoing'

            let dirMatch = false
            if (activeFilters.missed && isMissed) dirMatch = true
            if (activeFilters.inbound && isIncoming) dirMatch = true
            if (activeFilters.outbound && isOutgoing) dirMatch = true

            return dateMatch && dirMatch
        })
    }, [logs, activeFilters])

    const volumeData = useMemo(() => {
        const groups: Record<string, number> = {}
        const days = activeFilters.dateRange === '30d' ? 30 : activeFilters.dateRange === '90d' ? 90 : 7

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().split('T')[0]
            groups[key] = 0
        }

        filteredLogs.forEach(log => {
            const key = log.created_at.split('T')[0]
            if (groups[key] !== undefined) groups[key]++
        })

        return Object.entries(groups).map(([date, count]) => ({
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: days > 7 ? 'short' : undefined, day: days > 7 ? 'numeric' : undefined }),
            calls: count,
            date
        }))
    }, [filteredLogs, activeFilters.dateRange])

    const distributionData = useMemo(() => {
        const incoming = filteredLogs.filter(l => l.direction === 'incoming' && l.call_type !== 'missed').length
        const outgoing = filteredLogs.filter(l => l.direction === 'outgoing').length
        const missed = filteredLogs.filter(l => l.call_type === 'missed').length

        return [
            { name: 'Incoming', value: incoming, color: '#60A5FA', dotClass: 'bg-sky-400' },
            { name: 'Outgoing', value: outgoing, color: '#A78BFA', dotClass: 'bg-violet-400' },
            { name: 'Missed', value: missed, color: '#F9A8D4', dotClass: 'bg-pink-300' }
        ]
    }, [filteredLogs])

    const totalCalls = filteredLogs.length
    const totalDuration = filteredLogs.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0)
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m}m ${s}s`
    }

    const isDark = theme === 'dark'
    const gridColor = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.08)'
    const axisColor = isDark ? '#CBD5F5' : '#64748B'
    const tooltipBg = isDark ? '#0F172A' : '#FFFFFF'
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'
    const tooltipText = isDark ? '#E2E8F0' : '#0F172A'

    if (loading) {
        return (
            <div className="relative h-96 w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#f7f1ff] blur-3xl opacity-70 dark:opacity-20"></div>
                <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#edf2ff] blur-3xl opacity-70 dark:opacity-20"></div>
                <div className="relative z-10 flex h-full items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-white/20 dark:border-t-white"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[#f7f1ff] blur-3xl opacity-70 dark:opacity-20"></div>
            <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#edf2ff] blur-3xl opacity-70 dark:opacity-20"></div>

            <div className="relative z-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-[24px] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur dark:bg-white/5 dark:ring-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-400">Filters</p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Refine View</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200">
                            <Filter className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="mt-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-400">Date Range</label>
                            <div className="relative">
                                <select
                                    value={tempFilters.dateRange}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                                    className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-white/30"
                                >
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 3 Months</option>
                                </select>
                                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-400">Call Direction</label>

                            <label className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                                        <PhoneIncoming className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Inbound</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={tempFilters.inbound}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, inbound: e.target.checked }))}
                                    className="h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                />
                            </label>

                            <label className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                        <PhoneOutgoing className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Outbound</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={tempFilters.outbound}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, outbound: e.target.checked }))}
                                    className="h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                />
                            </label>

                            <label className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                                        <PhoneMissed className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Missed</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={tempFilters.missed}
                                    onChange={(e) => setTempFilters(prev => ({ ...prev, missed: e.target.checked }))}
                                    className="h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                />
                            </label>
                        </div>

                        <button
                            onClick={handleApplyFilters}
                            className="w-full rounded-full bg-slate-900 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_16px_30px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.3)] dark:bg-white dark:text-slate-900"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#eef2ff] opacity-70 dark:opacity-20"></div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Total Volume</p>
                            <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{totalCalls}</h3>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <ArrowUpRight className="h-3 w-3" />
                                <span>+12.5%</span>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#f4edff] opacity-70 dark:opacity-20"></div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Avg Duration</p>
                            <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{formatDuration(avgDuration)}</h3>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Optimal</span>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#ffeef6] opacity-70 dark:opacity-20"></div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Missed Rate</p>
                            <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                                {totalCalls > 0 ? Math.round((distributionData.find(d => d.name === 'Missed')?.value || 0) / totalCalls * 100) : 0}%
                            </h3>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                <span>vs 5.2% avg</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 rounded-[24px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Call Volume Trends</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-300">Daily interaction metrics</p>
                                </div>
                                <select className="rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs text-slate-600 shadow-sm focus:border-slate-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                    <option>This Week</option>
                                    <option>Last Week</option>
                                </select>
                            </div>
                            <div className="mt-6 h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={volumeData}>
                                        <defs>
                                            <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: axisColor }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: axisColor }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: tooltipBg, borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: tooltipText, fontSize: '12px', fontWeight: 600 }}
                                            cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="calls"
                                            stroke="#7C3AED"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#neonGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                            <div>
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Distribution</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-300">By call direction</p>
                            </div>

                            <div className="relative mt-6 h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={62}
                                            outerRadius={86}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: tooltipBg, borderRadius: '8px', border: `1px solid ${tooltipBorder}` }}
                                            itemStyle={{ color: tooltipText }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-semibold text-slate-900 dark:text-white">{totalCalls}</span>
                                    <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">Total</span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {distributionData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/5 dark:bg-white/5 dark:text-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-3 w-3 rounded-full ${item.dotClass}`}></div>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {Math.round((item.value / (totalCalls || 1)) * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
