"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BarChart3 } from 'lucide-react'

interface SectionToggleProps {
    className?: string
}

export function SectionToggle({ className = '' }: SectionToggleProps) {
    const pathname = usePathname()

    const isActivityFeed = pathname === '/monitor/activity-feed'
    const isAnalytics = pathname === '/monitor/analytics-dashboard'

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80 ${className}`}
        >
            <Link
                href="/monitor/activity-feed"
                aria-current={isActivityFeed ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${isActivityFeed
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    }`}
            >
                <Activity className="h-4 w-4" />
                Activity Feed
            </Link>
            <Link
                href="/monitor/analytics-dashboard"
                aria-current={isAnalytics ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${isAnalytics
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                    }`}
            >
                <BarChart3 className="h-4 w-4" />
                Analytics Dashboard
            </Link>
        </div>
    )
}
