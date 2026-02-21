"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { getDeviceLogs, type DeviceLog } from "@/app/lib/services/device-service"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Activity, Play, Square, Pause } from "lucide-react"

interface MachineStatusHubProps {
    machines: any[]
}

export function MachineStatusHub({ machines }: MachineStatusHubProps) {
    // Fetch logs for each machine (parallel)
    const machineQueries = useQueries({
        queries: machines.map((machine) => ({
            queryKey: ['machine-logs', machine.machine_id],
            queryFn: async () => {
                const now = new Date()
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
                const result = await getDeviceLogs(machine.machine_id, oneHourAgo, now)
                return result.success ? result.data : []
            },
            refetchInterval: 10000, // Refresh every 10 seconds
        })),
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {machines.map((machine, index) => {
                const query = machineQueries[index]
                const logs = (query.data || []) as DeviceLog[]
                const latestLog = logs[logs.length - 1] // API returns logs in ASCENDING order (oldest first)

                const isRunning = latestLog?.action === "SPINDLE_ON" || latestLog?.action === "WO_START" || latestLog?.action === "WO_RESUME"
                const isPaused = latestLog?.action === "WO_PAUSE" || latestLog?.action === "SPINDLE_OFF"
                const isStopped = latestLog?.action === "WO_STOP" || !latestLog

                return (
                    <Card key={machine.id} className="relative overflow-hidden group border-none shadow-md bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{machine.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: {machine.machine_id}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {query.isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                    ) : (
                                        <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" :
                                            isPaused ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                                                "bg-slate-300 dark:bg-slate-700"
                                            }`} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Active WO</span>
                                    <Badge variant={latestLog?.wo_id ? "outline" : "secondary"} className="font-mono">
                                        {latestLog?.wo_id ? `WO-${latestLog.wo_id}` : "Idle"}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <div className="flex items-center gap-1 font-medium">
                                        {isRunning ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Play className="w-3 h-3 fill-current" /> Running
                                            </span>
                                        ) : isPaused ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <Pause className="w-3 h-3 fill-current" /> Paused
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 flex items-center gap-1">
                                                <Square className="w-3 h-3 fill-current" /> Stopped
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {latestLog && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                            <Activity className="w-3 h-3" /> Latest Event
                                        </p>
                                        <p className="text-xs font-medium truncate" title={latestLog.action}>
                                            {latestLog.action} @ {new Date(latestLog.log_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        {/* Decorative background pulse for running machines */}
                        {isRunning && (
                            <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 pointer-events-none" />
                        )}
                    </Card>
                )
            })}
        </div>
    )
}
