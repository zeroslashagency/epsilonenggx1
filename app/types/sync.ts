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
  }
  recordsProcessed?: number
}
