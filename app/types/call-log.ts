export interface CallLog {
    id: string
    user_id: string
    phone_number: string
    contact_name?: string
    direction: string // incoming, outgoing, missed
    call_type: string
    scheduled_time?: string
    start_time: string
    end_time?: string
    duration_seconds: number
    file_url?: string
    upload_status?: string
    created_at: string
    latitude?: number
    longitude?: number
    location_accuracy?: number
    location_timestamp?: string
}

export interface CallLogStats {
    totalCalls: number
    incoming: number
    outgoing: number
    missed: number
    totalDuration: number // in minutes
}
