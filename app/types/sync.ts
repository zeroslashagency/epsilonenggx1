export interface SyncResult {
  success: boolean
  message: string
  data?: {
    synced: number
    failed: number
    total: number
    errors?: string[]
  }
  error?: string
  timestamp?: string
}

export interface HistoricalSyncResult extends SyncResult {
  dateRange?: {
    from: string
    to: string
    fromDate?: string
    toDate?: string
  }
  recordsProcessed?: number
  fetched?: number
  cleaned?: number
  stored?: number
  errors?: string[]
}
