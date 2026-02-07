"use client"

import { Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
}

const eventStyles = {
    screen_on: {
        badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        avatar: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    screen_off: {
        badge: 'border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300',
        bar: 'bg-slate-400',
        avatar: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    boot: {
        badge: 'border-blue-200/60 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-300',
        bar: 'bg-blue-500',
        avatar: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    },
    shutdown: {
        badge: 'border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300',
        bar: 'bg-amber-500',
        avatar: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    },
    default: {
        badge: 'border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300',
        bar: 'bg-slate-300',
        avatar: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
}

export function FeedCard({ event }: FeedCardProps) {
    const styles = eventStyles[event.event_type as keyof typeof eventStyles] ?? eventStyles.default
    const employeeName = event.employee_name || `Employee ${event.employee_code}`
    const initial = employeeName.charAt(0).toUpperCase() || 'U'
    const formattedTime = formatTime(event.event_time)
    const formattedDate = formatDate(event.event_time)
    const deviceLabel = event.device_id ? event.device_id.slice(0, 12) : 'Unknown'

    return (
        <div
            className={cn(
                'group relative grid grid-cols-1 gap-4 px-6 py-4 transition-colors md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'
            )}
        >
            <span className={cn('absolute left-3 top-6 h-10 w-1 rounded-full', styles.bar)} />

            <div className="flex items-center gap-3 min-w-0">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold', styles.avatar)}>
                    {initial}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{employeeName}</p>
                        <Badge className={cn('rounded-full', styles.badge)}>{formatEventType(event.event_type)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Employee ID {event.employee_code}</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 md:justify-end">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 sm:flex">
                    <Smartphone className="h-3 w-3" />
                    {deviceLabel}
                </div>
                <div className="flex flex-col items-end text-xs text-slate-400 dark:text-slate-500">
                    <span className="font-mono text-slate-600 dark:text-slate-300">{formattedTime}</span>
                    <span>{formattedDate}</span>
                </div>
            </div>
        </div>
    )
}

function formatEventType(type: string): string {
    const map: Record<string, string> = {
        screen_on: 'Screen On',
        screen_off: 'Screen Off',
        boot: 'Device Boot',
        shutdown: 'Shut Down',
    }
    return map[type] || type.replace(/_/g, ' ')
}

function formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
    })
}
