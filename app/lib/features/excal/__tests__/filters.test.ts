import { applyFilters } from '@/app/lib/features/excal/filters'
import type { ExcalRow } from '@/app/lib/features/excal/types'

function row(classification: ExcalRow['classification'], unknownKind: ExcalRow['unknownKind']): ExcalRow {
  return {
    rowId: `${classification}-${unknownKind ?? 'none'}`,
    segmentId: 'seg',
    timestampMs: 1,
    logTimeIso: new Date(1).toISOString(),
    action: 'SPINDLE_OFF',
    summary: '',
    notes: '',
    isComputed: false,
    isBanner: false,
    jobTag: '',
    groupId: null,
    isGroupStart: false,
    isGroupEnd: false,
    isLoadingSeparator: false,
    woId: 1,
    woCode: 'WO-1',
    deviceId: 1,
    deviceName: 'Device 1',
    partNo: 'P-1',
    operator: 'OP',
    jobType: 2,
    jobTypeLabel: 'Production',
    durationSec: 120,
    rawTargetDurationSec: 120,
    targetDurationSec: 120,
    pclSec: 120,
    idealSec: 120,
    varianceSec: 0,
    classification,
    classificationReason: '',
    unknownKind,
    okQty: null,
    allotedQty: null,
    rejectQty: null,
    timeSaved: null,
    computedTimeSavedDelta: null,
    sNo: 1,
    rawAction: 'SPINDLE_OFF',
  }
}

describe('excal filter behavior', () => {
  const rows = [
    row('GOOD', null),
    row('WARNING', null),
    row('BAD', null),
    row('UNKNOWN', 'BREAK_CONTEXT'),
    row('UNKNOWN', 'NON_PRODUCTION_EVENT'),
  ]

  it('GOOD_ONLY keeps only GOOD', () => {
    const filtered = applyFilters(rows, {
      mode: 'GOOD_ONLY',
      includeUnknown: false,
      includeBreakExtensions: false,
    })

    expect(filtered.map((item) => item.classification)).toEqual(['GOOD'])
  })

  it('GOOD_WARNING keeps GOOD+WARNING', () => {
    const filtered = applyFilters(rows, {
      mode: 'GOOD_WARNING',
      includeUnknown: false,
      includeBreakExtensions: false,
    })

    expect(filtered.map((item) => item.classification)).toEqual(['GOOD', 'WARNING'])
  })

  it('ALL keeps GOOD+WARNING+BAD', () => {
    const filtered = applyFilters(rows, {
      mode: 'ALL',
      includeUnknown: false,
      includeBreakExtensions: false,
    })

    expect(filtered.map((item) => item.classification)).toEqual(['GOOD', 'WARNING', 'BAD'])
  })

  it('UNKNOWN break rows require includeBreakExtensions=true', () => {
    const hidden = applyFilters(rows, {
      mode: 'ALL',
      includeUnknown: false,
      includeBreakExtensions: false,
    })
    const shown = applyFilters(rows, {
      mode: 'ALL',
      includeUnknown: false,
      includeBreakExtensions: true,
    })

    expect(hidden.some((item) => item.unknownKind === 'BREAK_CONTEXT')).toBe(false)
    expect(shown.some((item) => item.unknownKind === 'BREAK_CONTEXT')).toBe(true)
  })

  it('other UNKNOWN rows require includeUnknown=true', () => {
    const hidden = applyFilters(rows, {
      mode: 'ALL',
      includeUnknown: false,
      includeBreakExtensions: true,
    })
    const shown = applyFilters(rows, {
      mode: 'ALL',
      includeUnknown: true,
      includeBreakExtensions: true,
    })

    expect(hidden.some((item) => item.unknownKind === 'NON_PRODUCTION_EVENT')).toBe(false)
    expect(shown.some((item) => item.unknownKind === 'NON_PRODUCTION_EVENT')).toBe(true)
  })
})
