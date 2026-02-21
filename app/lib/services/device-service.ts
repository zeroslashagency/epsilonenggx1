import { apiGet } from '@/app/lib/utils/api-client'

export interface DeviceLog {
    id: number
    log_time: string
    timestamp?: string // From documentation
    action: string
    message?: string // From documentation
    wo_id?: number
    device_id: number
    uid?: number
    job_type?: number
}

export interface DeviceLogResponse {
    success?: boolean
    status?: string // From documentation
    error?: string | null
    result?: {
        logs: DeviceLog[]
        pagination: {
            total_items: number
            total_pages: number
            current_page: number
        }
    }
    data?: DeviceLog[] // From documentation
}

/**
 * Format date to DD-MM-YYYY HH:MM
 */
function formatDateForApi(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${day}-${month}-${year} ${hours}:${minutes}`
}

/**
 * Fetch device logs
 */
export async function getDeviceLogs(
    deviceId: string,
    startDate: Date,
    endDate: Date
): Promise<{ success: boolean; data?: DeviceLog[]; error?: string }> {
    try {
        const formattedStartDate = formatDateForApi(startDate)
        const formattedEndDate = formatDateForApi(endDate)

        // Use same-origin proxy route to avoid browser CSP/CORS issues.
        const params = new URLSearchParams()
        params.append('start_date', formattedStartDate)
        params.append('end_date', formattedEndDate)
        params.append('device_id', deviceId)

        const response = (await apiGet(`/api/device-log?${params.toString()}`)) as DeviceLogResponse

        const isSuccess = response && (response.success || response.status === 'success')
        const rawLogs = response?.result?.logs || response?.data || []

        if (isSuccess) {
            // Normalize logs to ensure log_time and action exist
            const normalizedLogs = rawLogs.map((log: any) => ({
                ...log,
                log_time: log.log_time || log.timestamp || new Date().toISOString(),
                action: log.action || log.message || 'UNKNOWN'
            }))
            return { success: true, data: normalizedLogs }
        }

        return {
            success: false,
            error: response?.error || 'Failed to fetch logs'
        }
    } catch (error) {
        console.error('Error fetching device logs:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
    }
}
