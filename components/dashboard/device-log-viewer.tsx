"use client"

import { useState, useCallback } from "react"
import { getDeviceLogs, type DeviceLog } from "@/app/lib/services/device-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Search, AlertCircle, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DeviceLogViewerProps {
    deviceId: string
}

export function DeviceLogViewer({ deviceId }: DeviceLogViewerProps) {
    const [logs, setLogs] = useState<DeviceLog[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Default to today
    const [startDate, setStartDate] = useState<string>(() => {
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        // Format for datetime-local: YYYY-MM-DDTHH:MM
        return toDateTimeLocal(now)
    })

    const [endDate, setEndDate] = useState<string>(() => {
        const now = new Date()
        now.setHours(23, 59, 59, 999)
        return toDateTimeLocal(now)
    })

    // Helper to format Date to datetime-local string
    function toDateTimeLocal(date: Date) {
        const offset = date.getTimezoneOffset() * 60000
        const localIso = new Date(date.getTime() - offset).toISOString().slice(0, 16)
        return localIso
    }

    const handleFetchLogs = useCallback(async () => {
        if (!deviceId) return

        setLoading(true)
        setError(null)
        setLogs([])

        try {
            const start = new Date(startDate)
            const end = new Date(endDate)

            const result = await getDeviceLogs(deviceId, start, end)

            if (result.success && result.data) {
                setLogs([...result.data].reverse())
            } else {
                setError(result.error || "Failed to fetch logs")
            }
        } catch (err) {
            setError("An unexpected error occurred")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [deviceId, startDate, endDate])

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="grid gap-1.5 flex-1">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="grid gap-1.5 flex-1">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <Button onClick={handleFetchLogs} disabled={loading}>
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 mr-2" />
                    )}
                    Fetch Logs
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Log Time</TableHead>
                            <TableHead className="w-[120px]">Action</TableHead>
                            <TableHead className="w-[100px]">WO ID</TableHead>
                            <TableHead className="w-[100px]">Job Type</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    {loading ? (
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            <span className="text-muted-foreground">Loading logs...</span>
                                        </div>
                                    ) : error ? (
                                        <span className="text-red-500">Failed to load logs</span>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <FileText className="w-8 h-8 mb-2 opacity-20" />
                                            <span>No logs found for this period</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {new Date(log.log_time).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-bold ${log.action.includes("START") || log.action.includes("ON")
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : log.action.includes("STOP") || log.action.includes("OFF")
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}
                                        >
                                            {log.action}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {log.wo_id || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {log.job_type === 1 ? "Setup" : log.job_type === 2 ? "Production" : "-"}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="max-h-[60px] overflow-y-auto whitespace-pre-wrap opacity-60">
                                            {JSON.stringify({ uid: log.uid, device_id: log.device_id }, null, 2)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
