"use client"

import { useState, useEffect } from 'react'
import { RefreshCw, Calendar, ArrowLeft, Activity, Smartphone, Clock, Monitor } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { EmployeeSidebar } from '../device-logs/EmployeeSidebar'
import { SectionToggle } from '../device-logs/SectionToggle'
import { FeedCard } from './FeedCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
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

function ActivityFeedPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState('today')

    useEffect(() => {
        fetchLogs()
    }, [selectedEmployee, dateRange])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append('range', dateRange)
            if (selectedEmployee) {
                params.append('employeeCode', selectedEmployee)
            }
            const result = await apiGet(`/api/monitor/device-logs?${params.toString()}`)
            if (result.success) {
                setData(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch device logs', error)
        } finally {
            setLoading(false)
        }
    }

    const events = data?.recentEvents || []
    const stats = data?.overview || { activeDevicesCount: 0, totalEventsToday: 0, totalEmployees: 0, uniqueDevices: 0 }

    return (
        <>
            <PageBreadcrumbs items={[
                { label: 'Monitor' },
                { label: 'Device Logs', href: '/monitor/device-logs' },
                { label: 'Activity Feed' }
            ]} />

            <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/monitor/device-logs" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="h-6 w-6 text-blue-500" />
                                Activity Feed
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Real-time device events stream
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Section Toggle */}
                <SectionToggle />

                {/* Main Layout */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Employee Sidebar - Floating Style */}
                    <div className="static lg:sticky lg:top-8 h-fit self-start">
                        <EmployeeSidebar
                            employees={data?.employees || []}
                            selectedEmployee={selectedEmployee}
                            onSelectEmployee={setSelectedEmployee}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 space-y-8">
                        {/* Stats Row - Minimal */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Smartphone className="h-5 w-5" />}
                                label="Active Devices"
                                value={stats.activeDevicesCount}
                                color="blue"
                            />
                            <StatCard
                                icon={<Activity className="h-5 w-5" />}
                                label="Total Events"
                                value={stats.totalEventsToday}
                                color="purple"
                            />
                            <StatCard
                                icon={<Monitor className="h-5 w-5" />}
                                label="Online"
                                value={data?.employees?.filter((e: any) => e.isOnline).length || 0}
                                color="emerald"
                            />
                            <StatCard
                                icon={<Clock className="h-5 w-5" />}
                                label="Unique"
                                value={stats.uniqueDevices}
                                color="amber"
                            />
                        </div>

                        {/* Feed Content */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    Live Feed
                                </h2>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {events.length} events {selectedEmployee ? `for ${selectedEmployee}` : 'total'}
                                </span>
                            </div>

                            {loading ? (
                                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 last:border-0 animate-pulse" />
                                    ))}
                                </Card>
                            ) : events.length > 0 ? (
                                <Card className="p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {events.map((event: RecentEvent, index: number) => (
                                            <FeedCard
                                                key={event.id}
                                                event={event}
                                                isLast={index === events.length - 1}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            ) : (
                                <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Activity className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">No activity recorded</p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                        Events will appear here in real-time
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'emerald' | 'blue' | 'purple' | 'amber' }) {
    const colors = {
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
        amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
    }

    return (
        <Card className="p-5 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
                </div>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </Card>
    )
}

export default function ProtectedActivityFeedPage() {
    return (
        <ProtectedRoute requireRole={['Super Admin', 'Admin']}>
            <ActivityFeedPage />
        </ProtectedRoute>
    )
}
