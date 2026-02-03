"use client"

import { Activity, Smartphone, Clock, Monitor, RefreshCw, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface RecentEvent {
    id: number
    employee_code: string
    employee_name: string
    device_id: string
    event_type: string
    event_time: string
    metadata?: any
}

interface ActivityFeedViewProps {
    data: any
    loading: boolean
    selectedEmployee: string | null
}

export function ActivityFeedView({ data, loading, selectedEmployee }: ActivityFeedViewProps) {
    const events = data?.recentEvents || []
    const stats = data?.overview || {
        activeDevicesCount: 0,
        totalEventsToday: 0,
        totalEmployees: 0,
        uniqueDevices: 0
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Smartphone className="h-5 w-5" />}
                    label="Active Devices"
                    value={stats.activeDevicesCount}
                    color="emerald"
                />
                <StatCard
                    icon={<Activity className="h-5 w-5" />}
                    label="Events Today"
                    value={stats.totalEventsToday}
                    color="blue"
                />
                <StatCard
                    icon={<Monitor className="h-5 w-5" />}
                    label="Total Employees"
                    value={stats.totalEmployees}
                    color="purple"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Unique Devices"
                    value={stats.uniqueDevices}
                    color="amber"
                />
            </div>

            {/* Activity Feed Title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Activity Feed</h2>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {events.length} events {selectedEmployee ? `for Employee ${selectedEmployee}` : 'total'}
                </span>
            </div>

            {/* Activity Table */}
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Time</th>
                                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Employee</th>
                                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Event</th>
                                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Device</th>
                                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {events.map((event: RecentEvent) => (
                                <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-mono text-slate-600 dark:text-slate-300">
                                            {new Date(event.event_time).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                                hour12: false
                                            })}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(event.event_time).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    {event.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{event.employee_name}</div>
                                                <div className="text-xs text-slate-500">ID: {event.employee_code}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getEventStyle(event.event_type)}`}>
                                            {formatEventType(event.event_type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-slate-600 dark:text-slate-300 font-mono text-xs">
                                            {event.device_id?.substring(0, 20)}...
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1">
                                            View <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {events.length === 0 && (
                    <div className="py-12 text-center">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400">No activity recorded</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Events will appear here when employees use the app</p>
                    </div>
                )}
            </Card>
        </div>
    )
}

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
    const colorClasses = {
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
    }

    return (
        <div className={`${colorClasses[color]} border rounded-xl p-5 transition-all hover:shadow-md`}>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wider opacity-75">{label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    )
}

function getEventStyle(type: string): string {
    switch (type) {
        case 'screen_on':
            return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        case 'screen_off':
            return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        case 'boot':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        default:
            return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
    }
}

function formatEventType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
