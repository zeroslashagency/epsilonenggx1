import { classifyRowsV2 } from '@/app/lib/features/excal/classification'
import type { ExcalRow } from '@/app/lib/features/excal/types'

function baseRow(overrides: Partial<ExcalRow> = {}): ExcalRow {
  return {
    rowId: 'row-1',
    segmentId: 'seg-1',
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
    idealSec: null,
    varianceSec: null,
    classification: 'UNKNOWN',
    classificationReason: '',
    unknownKind: null,
    okQty: null,
    allotedQty: null,
    rejectQty: null,
    timeSaved: null,
    computedTimeSavedDelta: null,
    sNo: null,
    rawAction: 'SPINDLE_OFF',
    ...overrides,
  }
}

describe('excal v2 classification boundaries', () => {
  it('ideal=120 actual=108 => GOOD', () => {
    const [row] = classifyRowsV2([baseRow({ durationSec: 108 })])
    expect(row.classification).toBe('GOOD')
  })

  it('ideal=120 actual=132 => GOOD', () => {
    const [row] = classifyRowsV2([baseRow({ durationSec: 132 })])
    expect(row.classification).toBe('GOOD')
  })

  it('ideal=120 actual=100 => WARNING', () => {
    const [row] = classifyRowsV2([baseRow({ durationSec: 100 })])
    expect(row.classification).toBe('WARNING')
  })

  it('ideal=120 actual=140 => WARNING', () => {
    const [row] = classifyRowsV2([baseRow({ durationSec: 140 })])
    expect(row.classification).toBe('WARNING')
  })

  it('ideal=120 actual=220 => BAD', () => {
    const [row] = classifyRowsV2([baseRow({ durationSec: 220 })])
    expect(row.classification).toBe('BAD')
  })
})

describe('excal v2 safeguards', () => {
  it('downgrades GOOD when target_duration==0 and time_saved>0', () => {
    const [row] = classifyRowsV2([
      baseRow({
        durationSec: 120,
        rawTargetDurationSec: 0,
        targetDurationSec: null,
        pclSec: 120,
        timeSaved: 10,
      }),
    ])

    expect(row.classification).toBe('WARNING')
    expect(row.classificationReason).toContain('TARGET_ZERO_TIME_SAVED_POSITIVE')
  })

  it('downgrades GOOD when ok_qty > alloted_qty', () => {
    const [row] = classifyRowsV2([
      baseRow({
        durationSec: 120,
        okQty: 11,
        allotedQty: 10,
      }),
    ])

    expect(row.classification).toBe('WARNING')
    expect(row.classificationReason).toContain('OK_QTY_EXCEEDS_ALLOTED')
  })

  it('downgrades GOOD when qty sanity exceeded', () => {
    const [row] = classifyRowsV2([
      baseRow({
        durationSec: 120,
        okQty: 100,
        rejectQty: 50,
        allotedQty: 100,
      }),
    ])

    expect(row.classification).toBe('WARNING')
    expect(row.classificationReason).toContain('QTY_SANITY_LIMIT_EXCEEDED')
  })

  it('appends mismatch note when time_saved differs from computed delta', () => {
    const [row] = classifyRowsV2([
      baseRow({
        durationSec: 108,
        timeSaved: 100,
      }),
    ])

    expect(row.classification).toBe('GOOD')
    expect(row.classificationReason).toContain('(time_saved mismatch)')
  })
})
