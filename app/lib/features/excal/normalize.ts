import type { NormalizedLog, RawDeviceLog } from './types'
import { buildLogIdentifier, sanitizeAction, toIsoDate, toInteger, toNonNegativeInteger, toPositiveNumber } from './utils'

export function normalizeLogs(rawLogs: RawDeviceLog[]): NormalizedLog[] {
  const dedupe = new Map<string, NormalizedLog>()

  for (const raw of rawLogs) {
    const { key, id } = buildLogIdentifier(raw)
    if (!key || id === null) continue

    const iso = toIsoDate(raw.log_time) ?? toIsoDate(raw.timestamp)
    if (!iso) continue

    const log: NormalizedLog = {
      logId: id,
      dedupeKey: key,
      action: sanitizeAction(raw.action, raw.message),
      logTimeIso: iso,
      logTimeMs: new Date(iso).getTime(),
      woId: toInteger(raw.wo_id),
      deviceId: toInteger(raw.device_id),
      operator: typeof raw.operator === 'string' && raw.operator.trim() ? raw.operator.trim() : null,
      partNo: typeof raw.part_no === 'string' && raw.part_no.trim() ? raw.part_no.trim() : null,
      reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
      jobType: toInteger(raw.job_type),
      rawTargetDuration: toInteger(raw.target_duration),
      targetDuration: toPositiveNumber(raw.target_duration),
      pcl: toPositiveNumber(raw.pcl),
      okQty: toNonNegativeInteger(raw.ok_qty),
      allotedQty: toNonNegativeInteger(raw.alloted_qty),
      rejectQty: toNonNegativeInteger(raw.reject_qty),
      timeSaved: toInteger(raw.time_saved),
      raw,
    }

    if (!dedupe.has(key)) {
      dedupe.set(key, log)
    }
  }

  return Array.from(dedupe.values()).sort((a, b) => a.logTimeMs - b.logTimeMs)
}
