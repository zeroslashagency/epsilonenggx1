import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const toneStyles = {
    blue: {
        glow: 'bg-blue-500/10 dark:bg-blue-500/20',
        icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    },
    emerald: {
        glow: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    },
    violet: {
        glow: 'bg-violet-500/10 dark:bg-violet-500/20',
        icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    },
    amber: {
        glow: 'bg-amber-500/10 dark:bg-amber-500/20',
        icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    },
    slate: {
        glow: 'bg-slate-500/10 dark:bg-slate-500/20',
        icon: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    },
} as const

type Tone = keyof typeof toneStyles

interface KpiCardProps {
    label: string
    value: React.ReactNode
    icon: React.ReactNode
    tone?: Tone
    helper?: string
    className?: string
}

export function KpiCard({ label, value, icon, tone = 'slate', helper, className }: KpiCardProps) {
    const styles = toneStyles[tone]

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70',
                className
            )}
        >
            <div
                className={cn(
                    'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl',
                    styles.glow
                )}
            />
            <CardContent className="relative">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            {label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
                        {helper && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
                    </div>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', styles.icon)}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface EmptyStateProps {
    icon: React.ReactNode
    title: string
    description?: string
    className?: string
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500 dark:text-slate-400',
                className
            )}
        >
            <div className="text-slate-300 dark:text-slate-600">{icon}</div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
    )
}
