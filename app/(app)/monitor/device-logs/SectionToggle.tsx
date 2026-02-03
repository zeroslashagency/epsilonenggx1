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
        <div className={`flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full w-fit ${className}`}>
            <Link
                href="/monitor/activity-feed"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${isActivityFeed
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
            >
                <Activity className="h-4 w-4" />
                Activity Feed
            </Link>
            <Link
                href="/monitor/analytics-dashboard"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${isAnalytics
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
            >
                <BarChart3 className="h-4 w-4" />
                Analytics Dashboard
            </Link>
        </div>
    )
}
