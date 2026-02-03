"use client"

import { Smartphone, Clock, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecentEvent {
    id: number
    employee_code: string
    employee_name: string
    device_id: string
    event_type: string
    event_time: string
    metadata?: any
}

interface FeedCardProps {
    event: RecentEvent
    isLast?: boolean
}

export function FeedCard({ event, isLast }: FeedCardProps) {
    const isOnline = event.event_type === 'screen_on'

    return (
        <div className={cn(
            "group flex items-center gap-3 py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-default",
            !isLast && "border-b border-slate-100 dark:border-slate-800"
        )}>
            {/* Minimal Avatar */}
            <div className="shrink-0 relative">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors",
                    isOnline
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                    {event.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
            </div>

            {/* Content Row */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {event.employee_name}
                    </span>
                    <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {formatEventType(event.event_type)}
                    </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* Device Badge (Subtle) */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/50">
                        <Smartphone className="w-3 h-3" />
                        {event.device_id?.slice(0, 8)}
                    </div>

                    {/* Time */}
                    <span className="text-xs text-slate-400 font-mono whitespace-nowrap w-16 text-right">
                        {new Date(event.event_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        })}
                    </span>
                </div>
            </div>

            {/* Status Line Indicator */}
            <div className={cn(
                "w-1 h-8 rounded-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity",
                event.event_type === 'screen_on' ? "bg-green-500" :
                    event.event_type === 'screen_off' ? "bg-slate-300 dark:bg-slate-600" :
                        "bg-blue-500"
            )} />
        </div>
    )
}

function formatEventType(type: string): string {
    const map: Record<string, string> = {
        'screen_on': 'Screen On',
        'screen_off': 'Screen Off',
        'boot': 'Device Boot',
        'shutdown': 'Shut Down'
    }
    return map[type] || type.replace(/_/g, ' ')
}
