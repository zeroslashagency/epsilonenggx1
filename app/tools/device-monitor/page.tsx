'use client'

import React, { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Activity,
    RefreshCw,
    Server,
    Wifi,
    WifiOff,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface DeviceStatus {
    device_id: string
    device_name: string
    last_sync: string
    status: string
    total_logs_today: number
    error_message?: string
}

interface SyncRequest {
    id: string
    sync_type: string
    status: string
    requested_at: string
    result?: string
}

export default function DeviceMonitorPage() {
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null)
    const [syncHistory, setSyncHistory] = useState<SyncRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const supabase = getSupabaseBrowserClient()

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // Fetch device status
            const { data: statusData, error: statusError } = await supabase
                .from('device_status')
                .select('*')
                .maybeSingle()

            if (statusError && statusError.code !== 'PGRST116') {
                console.error('Error fetching device status:', statusError)
            } else {
                setDeviceStatus(statusData)
            }

            // Fetch sync history
            const { data: historyData, error: historyError } = await supabase
                .from('sync_requests')
                .select('*')
                .order('requested_at', { ascending: false })
                .limit(10)

            if (historyError) {
                console.error('Error fetching sync history:', historyError)
            } else {
                setSyncHistory(historyData || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load device data')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleSync = async (type: 'manual' | 'historical' = 'manual') => {
        setIsSyncing(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                toast.error('You must be logged in to trigger a sync')
                return
            }

            const payload: any = {
                syncType: type,
                requestedBy: 'device-monitor-ui'
            }

            if (type === 'manual') {
                payload.action = 'immediate'
            } else if (type === 'historical') {
                if (!startDate || !endDate) {
                    toast.error('Please select both start and end dates')
                    setIsSyncing(false)
                    return
                }
                payload.dateFrom = startDate
                payload.dateTo = endDate
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/trigger-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to trigger sync')
            }

            toast.success(type === 'historical' ? 'Data recovery requested successfully' : 'Sync requested successfully')
            if (type === 'historical') {
                setStartDate('')
                setEndDate('')
            }
            fetchData() // Refresh list to show new request
        } catch (error: any) {
            console.error('Sync error:', error)
            toast.error(error.message || 'Failed to trigger sync')
        } finally {
            setIsSyncing(false)
        }
    }

    const isOnline = (lastSync: string) => {
        if (!lastSync) return false
        const diff = new Date().getTime() - new Date(lastSync).getTime()
        return diff < 5 * 60 * 1000 // Considered online if synced in last 5 minutes
    }

    return (
        <PermissionGuard module="tools_health" item="Device Monitor">
            <ZohoLayout breadcrumbs={[
                { label: 'Tools', href: '/tools' },
                { label: 'Device Monitor' }
            ]}>
                <div className="p-6 space-y-6 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Device Monitor</h1>
                            <p className="text-muted-foreground">Monitor attendance device status and trigger manual syncs</p>
                        </div>
                        <Button
                            onClick={fetchData}
                            variant="outline"
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Status
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Status Card */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" />
                                    Device Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {deviceStatus ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${isOnline(deviceStatus.last_sync) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {isOnline(deviceStatus.last_sync) ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{deviceStatus.device_name || 'Unknown Device'}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {isOnline(deviceStatus.last_sync) ? 'Online & Syncing' : 'Offline / Not Syncing'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={isOnline(deviceStatus.last_sync) ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                                                {isOnline(deviceStatus.last_sync) ? 'ONLINE' : 'OFFLINE'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 border rounded-lg space-y-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-sm">Last Sync</span>
                                                </div>
                                                <p className="font-medium">
                                                    {deviceStatus.last_sync ? formatDistanceToNow(new Date(deviceStatus.last_sync), { addSuffix: true }) : 'Never'}
                                                </p>
                                            </div>

                                            <div className="p-4 border rounded-lg space-y-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Activity className="h-4 w-4" />
                                                    <span className="text-sm">Logs Today</span>
                                                </div>
                                                <p className="font-medium text-2xl">{deviceStatus.total_logs_today || 0}</p>
                                            </div>

                                            <div className="p-4 border rounded-lg space-y-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-sm">Last Error</span>
                                                </div>
                                                <p className="font-medium text-sm text-red-500 truncate" title={deviceStatus.error_message || 'None'}>
                                                    {deviceStatus.error_message || 'None'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <Button
                                                onClick={() => handleSync('manual')}
                                                disabled={isSyncing}
                                                className="w-full sm:w-auto gap-2"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                                {isSyncing ? 'Requesting Sync...' : 'Sync Now (Fetch Missing Logs)'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Clicking this will trigger the Windows script to immediately fetch logs from the device.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No device status information available.</p>
                                        <p className="text-sm">The sync script may not have run yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Data Recovery Card */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Data Recovery
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Recover missing attendance data by selecting a date range.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-md"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-md"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={() => handleSync('historical')}
                                    disabled={isSyncing || !startDate || !endDate}
                                    className="w-full gap-2"
                                    variant="secondary"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    Recover Missing Data
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recent Activity Card */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Sync Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {syncHistory.length > 0 ? (
                                        syncHistory.map((req) => (
                                            <div key={req.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                                <div className={`mt-1 h-2 w-2 rounded-full ${req.status === 'completed' ? 'bg-green-500' :
                                                    req.status === 'pending' ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`} />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm font-medium capitalize">{req.sync_type}</p>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        Status: {req.status}
                                                    </p>
                                                    {req.result && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {req.result}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No recent sync activity</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </ZohoLayout>
        </PermissionGuard>
    )
}
