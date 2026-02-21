import { buildExcalWorkbook } from '@/app/lib/features/excal/excel'
import type { ExcalPipelineOutput, ExcalRow } from '@/app/lib/features/excal/types'

function makeRow(overrides: Partial<ExcalRow>): ExcalRow {
  return {
    rowId: 'r-1',
    segmentId: 's-1',
    timestampMs: 1,
    logTimeIso: new Date(1).toISOString(),
    action: 'SPINDLE_OFF',
    summary: 'summary',
    notes: 'note',
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
    classification: 'GOOD',
    classificationReason: 'Within green threshold',
    unknownKind: null,
    okQty: 1,
    allotedQty: 1,
    rejectQty: 0,
    timeSaved: 0,
    computedTimeSavedDelta: 0,
    sNo: 1,
    rawAction: 'SPINDLE_OFF',
    ...overrides,
  }
}

describe('excal excel export', () => {
  it('builds exactly Logs and Analysis sheets with required headers', () => {
    const payload: ExcalPipelineOutput = {
      rows: [
        makeRow({ action: 'WO_HEADER', isComputed: true, isBanner: true, sNo: null }),
        makeRow({ action: 'WO_SUMMARY', isComputed: true, isBanner: true, sNo: null }),
        makeRow({ action: 'PAUSE_BANNER', isComputed: true, isBanner: true, sNo: null }),
      ],
      kpis: {
        totalCycles: 1,
        goodCycles: 1,
        warningCycles: 0,
        badCycles: 0,
        goodRatePct: 100,
        avgDurationSec: 120,
        avgIdealSec: 120,
        avgVarianceSec: 0,
      },
      woBreakdown: [
        {
          woId: 1,
          woCode: 'WO-1',
          cycles: 1,
          good: 1,
          warning: 0,
          bad: 0,
          totalDurationSec: 120,
          rejectQty: 1,
        },
      ],
      operatorSummary: [
        {
          operator: 'OP',
          cycles: 1,
          good: 1,
          warning: 0,
          bad: 0,
          rejectQty: 1,
        },
      ],
      meta: {
        fetchedPages: 1,
        fetchedLogs: 1,
        normalizedLogs: 1,
        segments: 1,
        cycles: 1,
        jobs: 1,
      },
    }

    const workbook = buildExcalWorkbook(payload)
    expect(workbook.SheetNames).toEqual(['Logs', 'Analysis'])

    const logs = workbook.Sheets.Logs
    expect(logs.A1.v).toBe('S.No')
    expect(logs.B1.v).toBe('Log Time')
    expect(logs.C1.v).toBe('Action')
    expect(logs.D1.v).toBe('Job Tag')
    expect(logs.E1.v).toBe('Summary / Notes')
    expect(logs.F1.v).toBe('WO Core')
    expect(logs.G1.v).toBe('Setup / Device')
    expect(logs.H1.v).toBe('Job Type')
    expect(logs.I1.v).toBe('Operator')

    expect(logs.C2.v).toBe('WO_HEADER')
    expect(logs.C3.v).toBe('WO_SUMMARY')
    expect(logs.C4.v).toBe('PAUSE_BANNER')

    expect(logs['!merges']).toBeDefined()
    expect((logs['!merges'] || []).length).toBeGreaterThanOrEqual(3)
  })
})
