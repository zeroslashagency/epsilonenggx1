"use client"

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Pause, Search, RefreshCw, Smartphone, MapPin, Clock, Download, Volume2, X, ExternalLink } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { CallLog, CallLogStats } from '@/app/types/call-log'
import { CallAnalytics } from './CallAnalytics'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer'

const LocationMap = dynamic(() => import('@/components/CallRecordings/LocationMap'), { ssr: false })

type CallLogWithAudio = CallLog & { audio_url?: string }

function CallLogsPage() {
    const [logs, setLogs] = useState<CallLogWithAudio[]>([])
    const [stats, setStats] = useState<CallLogStats>({
        totalCalls: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        totalDuration: 0
    })
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview')
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const [playingId, setPlayingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [selectedLog, setSelectedLog] = useState<CallLogWithAudio | null>(null)

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [totalCount, setTotalCount] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        fetchLogs()
    }, [page, pageSize, filterType])

    const fetchLogs = async () => {
        if (logs.length === 0) setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', pageSize.toString())
            if (filterType !== 'all') params.append('type', filterType)
            if (searchQuery) params.append('search', searchQuery)

            const data = await apiGet(`/api/monitor/call-logs?${params.toString()}`)

            if (data.success) {
                setLogs(data.logs || [])
                setStats(data.stats)
                if (data.pagination) {
                    setTotalCount(data.pagination.totalCount)
                    setTotalPages(data.pagination.totalPages)
                }
            }
        } catch (error) {
            console.error('Failed to fetch call logs', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchLogs()
    }

    const handlePlayPause = (log: CallLogWithAudio) => {
        if (!log.audio_url) return
        if (playingId === log.id) {
            audioRef.current?.pause()
            setPlayingId(null)
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
            }
            const audio = new Audio(log.audio_url)
            audio.onended = () => setPlayingId(null)
            audio.play().catch(err => console.error("Audio play error:", err))
            audioRef.current = audio
            setPlayingId(log.id)
        }
    }

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s'
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    const getCallIcon = (direction: string, type: string) => {
        if (type === 'missed') return <PhoneMissed className="h-5 w-5 text-rose-600 dark:text-rose-300" />
        if (direction === 'incoming') return <PhoneIncoming className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        if (direction === 'outgoing') return <PhoneOutgoing className="h-5 w-5 text-sky-600 dark:text-sky-300" />
        return <Phone className="h-5 w-5 text-slate-500 dark:text-slate-300" />
    }

    const getTypeStyle = (direction: string, type: string) => {
        if (type === 'missed') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/20'
        if (direction === 'incoming') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/20'
        if (direction === 'outgoing') return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/20'
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
    }

    const getAccentStyle = (direction: string, type: string) => {
        if (type === 'missed') return 'bg-rose-400'
        if (direction === 'incoming') return 'bg-emerald-400'
        if (direction === 'outgoing') return 'bg-sky-400'
        return 'bg-slate-300'
    }

    const getIconWrapStyle = (direction: string, type: string) => {
        if (type === 'missed') return 'bg-rose-100/80 dark:bg-rose-500/15'
        if (direction === 'incoming') return 'bg-emerald-100/80 dark:bg-emerald-500/15'
        if (direction === 'outgoing') return 'bg-sky-100/80 dark:bg-sky-500/15'
        return 'bg-slate-100/80 dark:bg-white/10'
    }

    const handleOpenDrawer = (log: CallLogWithAudio) => {
        setSelectedLog(log)
        setDrawerOpen(true)
    }

    const handleDrawerChange = (open: boolean) => {
        setDrawerOpen(open)
        if (!open) setSelectedLog(null)
    }

    return (
        <>
            <PageBreadcrumbs items={[
                { label: 'Monitor Person' },
                { label: 'Call Recorder' }
            ]} />

            <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[#f8f7f2] via-white to-[#eef3ff] p-6 shadow-[0_40px_90px_rgba(15,23,42,0.12)] dark:border-white/10 dark:from-[#0b1120] dark:via-[#0f172a] dark:to-[#0b1120]">
                <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#f7f1ff] blur-3xl opacity-70 dark:opacity-20"></div>
                <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#edf2ff] blur-3xl opacity-70 dark:opacity-20"></div>

                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                                Monitor
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Call Recorder</h1>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Monitor call logs, recordings, and device activities.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.2)] dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition ${activeTab === 'logs' ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.2)] dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
                                >
                                    Call Logs
                                </button>
                            </div>
                            <button
                                onClick={fetchLogs}
                                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.3)] dark:bg-white dark:text-slate-900"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' ? (
                        <CallAnalytics logs={logs} loading={loading} />
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#eef2ff] opacity-70 dark:opacity-20"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Total Calls</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{stats.totalCalls}</p>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#ecfdf5] opacity-70 dark:opacity-20"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Incoming</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{stats.incoming}</p>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <PhoneIncoming className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#ffeef6] opacity-70 dark:opacity-20"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Missed</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{stats.missed}</p>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                                            <PhoneMissed className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#f4edff] opacity-70 dark:opacity-20"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Total Duration</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{stats.totalDuration > 0 ? `${stats.totalDuration}m` : 'N/A'}</p>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <form onSubmit={handleSearch}>
                                                <input
                                                    type="text"
                                                    placeholder="Search name or number..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-white/30"
                                                />
                                            </form>
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            className="rounded-full bg-slate-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.3)] dark:bg-white dark:text-slate-900"
                                        >
                                            Search
                                        </button>
                                    </div>

                                    <div>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm focus:border-slate-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="incoming">Incoming</option>
                                            <option value="outgoing">Outgoing</option>
                                            <option value="missed">Missed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <LoadingSpinner />
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="rounded-[24px] border border-white/70 bg-white/85 px-6 py-12 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                        No call logs found matching your criteria.
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div
                                            key={log.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`View details for ${log.contact_name || log.phone_number}`}
                                            onClick={() => handleOpenDrawer(log)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    handleOpenDrawer(log)
                                                }
                                            }}
                                            className="group relative overflow-hidden rounded-[24px] border border-white/70 bg-white/85 p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/5 dark:focus-visible:ring-white/20"
                                        >
                                            <div className={`absolute inset-y-0 left-0 w-1 ${getAccentStyle(log.direction, log.call_type)}`}></div>
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${getIconWrapStyle(log.direction, log.call_type)}`}>
                                                        {getCallIcon(log.direction, log.call_type)}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                                                {log.contact_name || log.phone_number}
                                                            </h3>
                                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${getTypeStyle(log.direction, log.call_type)}`}>
                                                                {log.call_type === 'missed' ? 'Missed' : log.direction}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-300">
                                                            ID: {log.user_id?.substring(0, 8)}... • {log.phone_number}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-300">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Smartphone className="h-3 w-3" />
                                                                {formatDuration(log.duration_seconds)}
                                                            </span>
                                                            {(typeof log.latitude === 'number' && typeof log.longitude === 'number') && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="h-3 w-3" />
                                                                    {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {log.audio_url ? (
                                                        <>
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    handlePlayPause(log)
                                                                }}
                                                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${playingId === log.id ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)] dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white/90 text-slate-600 shadow-sm hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
                                                            >
                                                                {playingId === log.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                                                {playingId === log.id ? 'Playing' : 'Play Recording'}
                                                            </button>
                                                            <a
                                                                href={log.audio_url}
                                                                download={`recording-${log.id}.mp3`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                                                aria-label="Download recording"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                                            No Audio
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {playingId === log.id && (
                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <Volume2 className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                                                        <div className="h-1.5 flex-1 rounded-full bg-slate-200/80 dark:bg-white/10">
                                                            <div className="h-full w-1/2 rounded-full bg-slate-900/80 animate-pulse dark:bg-white/70"></div>
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-300">Playing • {formatDuration(log.duration_seconds)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {!loading && totalPages > 1 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                                        Page {page} of {totalPages} · {totalCount} total
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Drawer open={drawerOpen} onOpenChange={handleDrawerChange} direction="right">
                <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-xl bg-white/95 backdrop-blur-xl border-l border-white/70 dark:bg-[#0f172a]/95 dark:border-white/10">
                    <div className="flex h-full flex-col">
                        <DrawerHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/10">
                            <div className="space-y-2">
                                <DrawerTitle className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    {selectedLog?.contact_name || selectedLog?.phone_number || 'Call Details'}
                                </DrawerTitle>
                                <DrawerDescription className="text-sm text-slate-500 dark:text-slate-300">
                                    Detailed call insight, playback, and location context.
                                </DrawerDescription>
                            </div>
                            <DrawerClose asChild>
                                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                    <X className="h-4 w-4" />
                                </button>
                            </DrawerClose>
                        </DrawerHeader>

                        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                            {selectedLog ? (
                                <>
                                    <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${getTypeStyle(selectedLog.direction, selectedLog.call_type)}`}>
                                                        {selectedLog.call_type === 'missed' ? 'Missed' : selectedLog.direction}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-300">ID: {selectedLog.user_id?.substring(0, 8)}...</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedLog.phone_number}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {selectedLog.audio_url ? (
                                                    <>
                                                        <button
                                                            onClick={() => handlePlayPause(selectedLog)}
                                                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${playingId === selectedLog.id ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)] dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}
                                                        >
                                                            {playingId === selectedLog.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                                            {playingId === selectedLog.id ? 'Playing' : 'Play Recording'}
                                                        </button>
                                                        <a
                                                            href={selectedLog.audio_url}
                                                            download={`recording-${selectedLog.id}.mp3`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                                            aria-label="Download recording"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </>
                                                ) : (
                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                                        No Audio
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Call Timeline</p>
                                            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center justify-between">
                                                    <span>Start</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.start_time ? new Date(selectedLog.start_time).toLocaleString() : 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>End</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.end_time ? new Date(selectedLog.end_time).toLocaleString() : 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Scheduled</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.scheduled_time ? new Date(selectedLog.scheduled_time).toLocaleString() : 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Duration</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{formatDuration(selectedLog.duration_seconds)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Call Metadata</p>
                                            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center justify-between">
                                                    <span>Direction</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.direction}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Type</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.call_type}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Status</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.upload_status || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Device</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{selectedLog.device_id || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">GPS Location</p>
                                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Map snapshot of the call location.</p>
                                            </div>
                                            {typeof selectedLog.latitude === 'number' && typeof selectedLog.longitude === 'number' ? (
                                                <a
                                                    href={`https://www.openstreetmap.org/?mlat=${selectedLog.latitude}&mlon=${selectedLog.longitude}#map=16/${selectedLog.latitude}/${selectedLog.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                                >
                                                    Open Map
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : null}
                                        </div>

                                        <div className="mt-4">
                                            {typeof selectedLog.latitude === 'number' && typeof selectedLog.longitude === 'number' ? (
                                                <LocationMap
                                                    latitude={selectedLog.latitude}
                                                    longitude={selectedLog.longitude}
                                                    accuracy={selectedLog.location_accuracy}
                                                    timestamp={selectedLog.location_timestamp}
                                                />
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                                    No GPS data available for this call.
                                                </div>
                                            )}
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {typeof selectedLog.latitude === 'number' && typeof selectedLog.longitude === 'number'
                                                        ? `${selectedLog.latitude.toFixed(5)}, ${selectedLog.longitude.toFixed(5)}`
                                                        : 'Coordinates unavailable'}
                                                </span>
                                                <span>Accuracy: {selectedLog.location_accuracy ? `${Math.round(selectedLog.location_accuracy)}m` : 'N/A'}</span>
                                                <span>Captured: {selectedLog.location_timestamp ? new Date(selectedLog.location_timestamp).toLocaleString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">Select a call log to view details.</div>
                            )}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    )
}

export default function ProtectedCallLogsPage() {
    return (
        <ProtectedPage
            module="web_user_attendance"
            item="Calls: Calls"
            permission="view"
            anyOf={[
                { module: 'web_user_attendance', item: 'Calls: Call Logs', permission: 'view' },
                { module: 'web_user_attendance', item: 'Calls: Voice Record', permission: 'view' },
                { module: 'web_user_attendance', item: 'Calls: Call Logs GPS', permission: 'view' }
            ]}
        >
            <CallLogsPage />
        </ProtectedPage>
    )
}
