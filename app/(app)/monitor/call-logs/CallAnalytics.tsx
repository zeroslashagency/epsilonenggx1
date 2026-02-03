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
    const [dateRange, setDateRange] = useState('7d')
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

    // Filter logs based on active filters
    const filteredLogs = useMemo(() => {
        const now = new Date()
        const past = new Date()
        if (activeFilters.dateRange === '30d') past.setDate(now.getDate() - 30)
        else if (activeFilters.dateRange === '90d') past.setDate(now.getDate() - 90)
        else past.setDate(now.getDate() - 7) // default 7d

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

    // Calculate Volume Data from FILTERED logs
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

    // Calculate Distribution Data from FILTERED logs (Mutually Exclusive)
    const distributionData = useMemo(() => {
        const incoming = filteredLogs.filter(l => l.direction === 'incoming' && l.call_type !== 'missed').length
        const outgoing = filteredLogs.filter(l => l.direction === 'outgoing').length
        const missed = filteredLogs.filter(l => l.call_type === 'missed').length

        return [
            { name: 'Incoming', value: incoming, color: '#10B981' },
            { name: 'Outgoing', value: outgoing, color: '#3B82F6' },
            { name: 'Missed', value: missed, color: '#F472B6' }
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

    // Chart Colors based on Theme
    const isDark = theme === 'dark'
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
    const axisColor = isDark ? "#94A3B8" : "#64748B"
    const tooltipBg = isDark ? "#0F172A" : "#FFFFFF"
    const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
    const tooltipText = isDark ? "#E2E8F0" : "#1E293B"

    if (loading) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-white/5">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-cyan-500"></div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-[#0B1120] p-6 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background Glows (Dark Mode Only) */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 dark:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none opacity-0 dark:opacity-100 transition-opacity"></div>

            {/* Light Mode subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-white/50 pointer-events-none dark:opacity-0"></div>

            <div className="flex flex-col lg:flex-row gap-6 text-slate-800 dark:text-slate-100 relative z-10">

                {/* Glass Sidebar Filters */}
                <div className="w-full lg:w-72 space-y-6">
                    <div className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
                        {/* Top Border Accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-70"></div>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">FILTERS</h3>
                            <Filter className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                        </div>

                        <div className="space-y-6">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date Range</label>
                                <div className="relative">
                                    <select
                                        value={tempFilters.dateRange}
                                        onChange={(e) => setTempFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                                        className="w-full bg-slate-50/80 dark:bg-[#0F172A]/50 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-cyan-500/50 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-[#0F172A]/70 transition-colors"
                                    >
                                        <option value="7d">Last 7 Days</option>
                                        <option value="30d">Last 30 Days</option>
                                        <option value="90d">Last 3 Months</option>
                                    </select>
                                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Call Type Toggle */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Call Direction</label>
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#0F172A]/30 hover:bg-slate-100 dark:hover:bg-[#0F172A]/50 border border-transparent hover:border-slate-200 dark:hover:border-white/5 cursor-pointer group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors">
                                                <PhoneIncoming className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Inbound</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={tempFilters.inbound}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, inbound: e.target.checked }))}
                                            className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#0F172A]/30 hover:bg-slate-100 dark:hover:bg-[#0F172A]/50 border border-transparent hover:border-slate-200 dark:hover:border-white/5 cursor-pointer group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                                                <PhoneOutgoing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Outbound</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={tempFilters.outbound}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, outbound: e.target.checked }))}
                                            className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#0F172A]/30 hover:bg-slate-100 dark:hover:bg-[#0F172A]/50 border border-transparent hover:border-slate-200 dark:hover:border-white/5 cursor-pointer group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-200 dark:group-hover:bg-pink-500/20 transition-colors">
                                                <PhoneMissed className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Missed</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={tempFilters.missed}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, missed: e.target.checked }))}
                                            className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                                        />
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleApplyFilters}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-cyan-900/20 transition-all transform active:scale-95"
                            >
                                APPLY FILTERS
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Area */}
                <div className="flex-1 space-y-6">

                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-5 relative group overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Phone className="w-16 h-16 text-slate-900 dark:text-white" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Volume</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{totalCalls}</h3>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>+12.5%</span>
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-5 relative group overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Clock className="w-16 h-16 text-purple-500 dark:text-purple-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Avg Duration</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{formatDuration(avgDuration)}</h3>
                            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-medium bg-purple-100 dark:bg-purple-500/10 w-fit px-2 py-1 rounded-full border border-purple-200 dark:border-purple-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Optimal</span>
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-lg border border-slate-200 dark:border-white/10 rounded-2xl p-5 relative group overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <PhoneMissed className="w-16 h-16 text-pink-500 dark:text-pink-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Missed Rate</p>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                {totalCalls > 0 ? Math.round((distributionData.find(d => d.name === 'Missed')?.value || 0) / totalCalls * 100) : 0}%
                            </h3>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-100 dark:bg-slate-700/30 w-fit px-2 py-1 rounded-full border border-slate-200 dark:border-white/5">
                                <span>vs 5.2% avg</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Area Chart */}
                        <div className="lg:col-span-2 bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Call Volume Trends</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Daily interaction metrics</p>
                                </div>
                                <select className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5 focus:ring-0">
                                    <option>This Week</option>
                                    <option>Last Week</option>
                                </select>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={volumeData}>
                                        <defs>
                                            <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
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
                                            cursor={{ stroke: '#22D3EE', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="calls"
                                            stroke="#8B5CF6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#neonGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div className="bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Distribution</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">By call direction</p>
                            </div>

                            <div className="relative h-60 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
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
                                {/* Center Stats */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">{totalCalls}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Total</span>
                                </div>
                            </div>

                            <div className="space-y-3 mt-4">
                                {distributionData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
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
