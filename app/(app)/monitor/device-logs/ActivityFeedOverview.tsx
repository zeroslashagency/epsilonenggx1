"use client"

import { Activity, Smartphone, Clock, Monitor } from 'lucide-react'

interface RecentEvent {
    id: number
    employee_code: string
    employee_name: string
    device_id: string
    event_type: string
    event_time: string
}

interface ActivityFeedOverviewProps {
    events: RecentEvent[]
    stats: {
        activeDevicesCount: number
        totalEventsToday: number
        totalEmployees: number
        uniqueDevices: number
    }
}

export function ActivityFeedOverview({ events, stats }: ActivityFeedOverviewProps) {
    return (
        <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<Smartphone className="h-5 w-5 text-emerald-500" />}
                    label="Active Devices"
                    value={stats.activeDevicesCount}
                    color="emerald"
                />
                <StatCard
                    icon={<Activity className="h-5 w-5 text-blue-500" />}
                    label="Events Today"
                    value={stats.totalEventsToday}
                    color="blue"
                />
                <StatCard
                    icon={<Monitor className="h-5 w-5 text-purple-500" />}
                    label="Total Employees"
                    value={stats.totalEmployees}
                    color="purple"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5 text-amber-500" />}
                    label="Unique Devices"
                    value={stats.uniqueDevices}
                    color="amber"
                />
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Live Activity Feed</h3>
                    </div>
                    <span className="text-xs text-slate-500">{events.length} events</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto">
                    {events.slice(0, 15).map((event) => (
                        <div key={event.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="text-xs text-slate-400 font-mono w-16 shrink-0">
                                {new Date(event.event_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}
                            </div>
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {event.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {event.employee_name}
                                </p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getEventStyle(event.event_type)}`}>
                                {formatEventType(event.event_type)}
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-400">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            No recent activity
                        </div>
                    )}
                </div>
            </div>
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
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
    }

    return (
        <div className={`${colorClasses[color]} border rounded-xl p-4 transition-all hover:shadow-md`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
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
