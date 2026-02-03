"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/StatusBadge"
import { TimeAgo } from "@/components/TimeAgo"
import { AttendanceLog } from '@/app/types'

interface RecentActivityTableProps {
    logs: AttendanceLog[]
    loading: boolean
    error: string | null
    onRetry: () => void
    canView: boolean
}

export function RecentActivityTable({
    logs,
    loading,
    error,
    onRetry,
    canView
}: RecentActivityTableProps) {
    if (!canView) {
        return null
    }

    return (
        <Card className="rounded-xl border border-border/50 shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/30">
                <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Today&apos;s Activity</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Real-time punch activities</p>
            </div>

            {error && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">Failed to Load Today&apos;s Activity</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRetry}
                            className="border-red-300 text-red-700 hover:bg-red-100"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            {loading && !error ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-5">
                    <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-muted-foreground">Loading today&apos;s activity...</p>
                </div>
            ) : !error && logs.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 border-b border-border/50">
                                <TableHead className="font-bold text-foreground py-4">Employee Code</TableHead>
                                <TableHead className="font-bold text-foreground">Employee Name</TableHead>
                                <TableHead className="font-bold text-foreground">Status</TableHead>
                                <TableHead className="font-bold text-foreground">Time</TableHead>
                                <TableHead className="font-bold text-foreground text-right">Time Ago</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.slice(0, 20).map((log, index) => (
                                <TableRow
                                    key={log.id || index}
                                    className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                                >
                                    <TableCell className="font-semibold py-4">{log.employee_code}</TableCell>
                                    <TableCell className="font-medium">{log.employee_name || '-'}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={(log.punch_direction || 'in') as "in" | "out" | "check-in" | "check-out"} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-sm">
                                        {new Date(log.log_date).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-sm">
                                        <TimeAgo date={log.log_date} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : !error ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-5">
                    <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">No Activity Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            No punches recorded for today. Data will appear here as employees check in.
                        </p>
                    </div>
                </div>
            ) : null}
        </Card>
    )
}
