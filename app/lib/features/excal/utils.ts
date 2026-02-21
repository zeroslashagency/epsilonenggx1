import type { ExcalRow, NormalizedLog } from './types'

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function toPositiveNumber(value: unknown): number | null {
  const parsed = toNumber(value)
  if (parsed === null || parsed <= 0) return null
  return parsed
}

export function toInteger(value: unknown): number | null {
  const parsed = toNumber(value)
  if (parsed === null) return null
  return Number.isInteger(parsed) ? parsed : Math.round(parsed)
}

export function toNonNegativeInteger(value: unknown): number | null {
  const parsed = toInteger(value)
  if (parsed === null || parsed < 0) return null
  return parsed
}

export function sanitizeAction(action: unknown, message: unknown): string {
  const source = typeof action === 'string' && action.trim() ? action : typeof message === 'string' ? message : 'UNKNOWN'
  return source.trim().toUpperCase()
}

export function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

export function fmtDuration(durationSec: number | null): string {
  if (durationSec === null || !Number.isFinite(durationSec)) return '-'
  return `${Math.round(durationSec)} sec`
}

export function isProduction(row: ExcalRow): boolean {
  return row.jobType === 2 || row.jobTypeLabel === 'Production'
}

export function actionLooksBreakLike(action: string): boolean {
  const upper = action.toUpperCase()
  return upper.includes('BREAK') || upper.includes('PAUSE') || upper.includes('IDLE')
}

export function isValidLogId(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function buildLogIdentifier(log: { log_id?: unknown; id?: unknown }): { key: string; id: number | null } {
  const primary = toInteger(log.log_id)
  if (primary !== null && primary > 0) {
    return { key: `log_id:${primary}`, id: primary }
  }

  const fallback = toInteger(log.id)
  if (fallback !== null && fallback > 0) {
    return { key: `id:${fallback}`, id: fallback }
  }

  return { key: '', id: null }
}

export function clampHistory(history: number[], maxSize: number): number[] {
  if (history.length <= maxSize) return history
  return history.slice(history.length - maxSize)
}

export function jobTypeLabel(jobType: number | null): string {
  if (jobType === 1) return 'Setup'
  if (jobType === 2) return 'Production'
  return 'Unknown'
}

export function buildWoCode(woId: number | null, woNo?: string | null): string | null {
  if (woNo && woNo.trim()) return woNo.trim()
  if (woId !== null) return `WO-${woId}`
  return null
}

export function pickDeviceName(deviceId: number | null, woDeviceName?: string | null): string {
  if (woDeviceName && woDeviceName.trim()) return woDeviceName.trim()
  if (deviceId !== null) return `Device ${deviceId}`
  return 'Device -'
}

export function sortRowsDescending(rows: ExcalRow[]): ExcalRow[] {
  return [...rows].sort((a, b) => {
    if (b.timestampMs !== a.timestampMs) return b.timestampMs - a.timestampMs
    return a.rowId.localeCompare(b.rowId)
  })
}

export function assignSerialNumbers(rowsDescending: ExcalRow[]): ExcalRow[] {
  let serial = 1
  return rowsDescending.map((row) => {
    if (!row.isComputed && !row.isBanner) {
      return { ...row, sNo: serial++ }
    }
    return { ...row, sNo: null }
  })
}

export function toSegmentId(log: NormalizedLog, index: number): string {
  return `SEG-${log.woId ?? 'NA'}-${log.logId}-${index}`
}
