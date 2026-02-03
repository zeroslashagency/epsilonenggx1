"use client"

import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Pause, Search, RefreshCw, Smartphone, MapPin, Clock, Download, Volume2 } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CallLog, CallLogStats } from '@/app/types/call-log'
import { CallAnalytics } from './CallAnalytics'

function CallLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
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

    const handlePlayPause = (log: any) => {
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
        if (type === 'missed') return <PhoneMissed className="w-4 h-4 text-red-500" />
        if (direction === 'incoming') return <PhoneIncoming className="w-4 h-4 text-green-500" />
        if (direction === 'outgoing') return <PhoneOutgoing className="w-4 h-4 text-blue-500" />
        return <Phone className="w-4 h-4 text-gray-500" />
    }

    const getTypeStyle = (direction: string, type: string) => {
        if (type === 'missed') return 'bg-red-50 text-red-700 border-red-200'
        if (direction === 'incoming') return 'bg-green-50 text-green-700 border-green-200'
        if (direction === 'outgoing') return 'bg-blue-50 text-blue-700 border-blue-200'
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }

    return (
        <>
            <PageBreadcrumbs items={[
                { label: 'Monitor Person' },
                { label: 'Call Recorder' }
            ]} />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Call Recorder</h1>
                        <p className="text-sm text-[#95AAC9] mt-1">Monitor call logs, recordings, and device activities.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Call Logs
                            </button>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#2C7BE5] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {activeTab === 'overview' ? (
                    <CallAnalytics logs={logs} loading={loading} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Total Calls</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCalls}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                        <PhoneIncoming className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Incoming</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.incoming}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                                        <PhoneMissed className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Missed</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.missed}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Total Duration</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDuration > 0 ? `${stats.totalDuration}m` : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                <div className="flex flex-1 gap-2">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <form onSubmit={handleSearch}>
                                            <input
                                                type="text"
                                                placeholder="Search name or number..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                                            />
                                        </form>
                                    </div>
                                    <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                                        Search
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
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
                                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500">
                                    No call logs found matching your criteria.
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`p-3 rounded-full ${log.call_type === 'missed' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                    {getCallIcon(log.direction, log.call_type)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                                            {log.contact_name || log.phone_number}
                                                        </h3>
                                                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${getTypeStyle(log.direction, log.call_type)}`}>
                                                            {log.call_type === 'missed' ? 'MISSED' : log.direction}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        ID: {log.user_id?.substring(0, 8)}... • {log.phone_number}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Smartphone className="w-3 h-3" />
                                                            {formatDuration(log.duration_seconds)}
                                                        </span>
                                                        {(log.latitude && log.longitude) && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
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
                                                            onClick={() => handlePlayPause(log)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${playingId === log.id ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
                                                        >
                                                            {playingId === log.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                            {playingId === log.id ? 'Playing...' : 'Play Recording'}
                                                        </button>
                                                        <a
                                                            href={log.audio_url}
                                                            download={`recording-${log.id}.mp3`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No Audio</span>
                                                )}
                                            </div>
                                        </div>

                                        {playingId === log.id && (
                                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                                <Volume2 className="w-4 h-4 text-gray-500" />
                                                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 w-1/2 animate-pulse"></div>
                                                </div>
                                                <span className="text-xs text-gray-500">Playing... / {formatDuration(log.duration_seconds)}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {!loading && totalPages > 1 && (
                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default function ProtectedCallLogsPage() {
    return (
        <ProtectedRoute requireRole={['Super Admin', 'Admin']}>
            <CallLogsPage />
        </ProtectedRoute>
    )
}
