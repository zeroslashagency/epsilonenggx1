import type { Classification, ExcalRow, UnknownKind } from './types'
import { actionLooksBreakLike, clampHistory, median } from './utils'

function baselineFromRow(row: ExcalRow, rollingMedian: number | null): number | null {
  const primary = row.jobType === 2
    ? row.targetDurationSec && row.targetDurationSec > 0
      ? row.targetDurationSec
      : row.pclSec && row.pclSec > 0
        ? row.pclSec
        : null
    : row.pclSec && row.pclSec > 0
      ? row.pclSec
      : null

  if (primary && primary > 0) return primary
  if (rollingMedian && rollingMedian > 0) return rollingMedian
  return 120
}

function classifyDelta(actual: number, ideal: number): { classification: Classification; reason: string } {
  const greenBuffer = Math.max(5, ideal * 0.1)
  const warningBuffer = Math.max(greenBuffer, ideal * 0.25)
  const delta = actual - ideal
  const absDelta = Math.abs(delta)

  if (absDelta <= greenBuffer) {
    return {
      classification: 'GOOD',
      reason: 'Within green threshold',
    }
  }

  if (absDelta <= warningBuffer) {
    return {
      classification: 'WARNING',
      reason: `${Math.round(absDelta)} sec ${delta < 0 ? 'lower' : 'excess'}`,
    }
  }

  return {
    classification: 'BAD',
    reason: `${Math.round(absDelta)} sec ${delta < 0 ? 'lower' : 'excess'}`,
  }
}

function isQtySanityExceeded(row: ExcalRow): boolean {
  const ok = row.okQty
  const reject = row.rejectQty
  const alloted = row.allotedQty

  if (ok !== null && ok < 0) return true
  if (reject !== null && reject < 0) return true
  if (alloted !== null && alloted < 0) return true

  if (ok !== null && reject !== null && alloted !== null && alloted > 0) {
    const produced = ok + reject
    if (produced > alloted * 1.2) return true
  }

  return false
}

function resolveUnknownKind(action: string): Exclude<UnknownKind, null> {
  return actionLooksBreakLike(action) ? 'BREAK_CONTEXT' : 'NON_PRODUCTION_EVENT'
}

function isClassifiableCycleRow(row: ExcalRow): boolean {
  return row.jobTypeLabel === 'Production' && row.action === 'SPINDLE_OFF' && typeof row.durationSec === 'number'
}

export function classifyRowsV2(rowsAscending: ExcalRow[]): ExcalRow[] {
  const historyByKey = new Map<string, number[]>()

  return rowsAscending.map((row) => {
    if (!isClassifiableCycleRow(row) || row.durationSec === null) {
      return {
        ...row,
        classification: 'UNKNOWN',
        classificationReason: resolveUnknownKind(row.action),
        unknownKind: resolveUnknownKind(row.action),
      }
    }

    const key = `${row.deviceId ?? 'NA'}:${row.partNo ?? 'NA'}`
    const history = historyByKey.get(key) ?? []
    const rolling = median(history)
    const ideal = baselineFromRow(row, rolling)

    if (!ideal || ideal <= 0) {
      return {
        ...row,
        classification: 'UNKNOWN',
        classificationReason: 'UNKNOWN_BASELINE',
        unknownKind: 'NON_PRODUCTION_EVENT',
      }
    }

    const base = classifyDelta(row.durationSec, ideal)

    let classification = base.classification
    let reason = base.reason

    if (classification === 'GOOD' && row.rawTargetDurationSec === 0 && (row.timeSaved ?? 0) > 0) {
      classification = 'WARNING'
      reason = 'TARGET_ZERO_TIME_SAVED_POSITIVE'
    }

    if (classification === 'GOOD' && row.okQty !== null && row.allotedQty !== null && row.okQty > row.allotedQty) {
      classification = 'WARNING'
      reason = 'OK_QTY_EXCEEDS_ALLOTED'
    }

    if (classification === 'GOOD' && isQtySanityExceeded(row)) {
      classification = 'WARNING'
      reason = 'QTY_SANITY_LIMIT_EXCEEDED'
    }

    const computedTimeSavedDelta = Math.round(ideal - row.durationSec)
    if (row.timeSaved !== null && Math.abs(row.timeSaved - computedTimeSavedDelta) > 1) {
      reason = `${reason} (time_saved mismatch)`
    }

    const updatedHistory = clampHistory([...history, row.durationSec], 20)
    historyByKey.set(key, updatedHistory)

    return {
      ...row,
      idealSec: ideal,
      varianceSec: row.durationSec - ideal,
      classification,
      classificationReason: reason,
      unknownKind: null,
      computedTimeSavedDelta,
    }
  })
}
