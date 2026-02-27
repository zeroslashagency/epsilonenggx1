import {
  applyPieceSlice,
  buildPieceFlowRows,
  filterPieceFlowRows,
  resolvePieceRenderMode,
  formatImportFailureAlert,
  formatSchedulingFailureAlert,
  safelyEvaluate,
} from '@/app/lib/features/scheduling/piece-flow-helpers'

describe('piece flow helpers', () => {
  it('CHK-172: uses synthetic fallback only when piece timeline is absent', () => {
    const scheduleRows = [
      {
        partNumber: 'PN1',
        batchId: 'B01',
        operationSeq: 1,
        machine: 'VMC1',
        runStart: '2026-02-22T06:00:00',
        runEnd: '2026-02-22T06:10:00',
        batchQty: 2,
        status: 'Scheduled',
      },
    ]

    const timelineRows = [
      {
        partNumber: 'PN1',
        batchId: 'B01',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 1',
        runStart: '2026-02-22T06:00:00',
        runEnd: '2026-02-22T06:05:00',
        status: 'Scheduled',
      },
      {
        partNumber: 'PN1',
        batchId: 'B01',
        piece: 2,
        operationSeq: 1,
        machine: 'VMC 1',
        runStart: '2026-02-22T06:05:00',
        runEnd: '2026-02-22T06:10:00',
        status: 'Scheduled',
      },
    ]

    const exact = buildPieceFlowRows(scheduleRows, timelineRows)
    const synthetic = buildPieceFlowRows(scheduleRows, [])

    expect(exact.isApproximate).toBe(false)
    expect(synthetic.isApproximate).toBe(true)
    expect(exact.rows).toHaveLength(2)
    expect(synthetic.rows).toHaveLength(2)
  })

  it('CHK-176/177/178: operation, machine, and batch filtering works', () => {
    const base = buildPieceFlowRows(
      [
        {
          partNumber: 'PN1',
          batchId: 'B01',
          operationSeq: 1,
          machine: 'VMC 1',
          runStart: '2026-02-22T06:00:00',
          runEnd: '2026-02-22T06:10:00',
          batchQty: 1,
        },
        {
          partNumber: 'PN1',
          batchId: 'B02',
          operationSeq: 2,
          machine: 'VMC 2',
          runStart: '2026-02-22T06:10:00',
          runEnd: '2026-02-22T06:20:00',
          batchQty: 1,
        },
      ],
      []
    ).rows

    const byOp = filterPieceFlowRows(base, { operationSeq: 2 })
    expect(byOp).toHaveLength(1)
    expect(byOp[0].operationSeq).toBe(2)

    const byMachine = filterPieceFlowRows(base, { machine: 'VMC2' })
    expect(byMachine).toHaveLength(1)
    expect(byMachine[0].machine).toBe('VMC 2')

    const byBatch = filterPieceFlowRows(base, { batch: 'B01' })
    expect(byBatch).toHaveLength(1)
    expect(byBatch[0].batch).toBe('B01')
  })

  it('resolves render mode by policy and density', () => {
    expect(resolvePieceRenderMode('slice', 1000)).toBe('slice')
    expect(resolvePieceRenderMode('all', 1000)).toBe('all')
    expect(resolvePieceRenderMode('auto', 100)).toBe('all')
    expect(resolvePieceRenderMode('auto', 1000, 420)).toBe('slice')
  })

  it('applies piece slice boundaries safely', () => {
    const rows = [
      { id: 'r1', piece: 1 },
      { id: 'r2', piece: 2 },
      { id: 'r3', piece: 3 },
    ]

    expect(applyPieceSlice(rows, 2, 3).map(row => row.id)).toEqual(['r2', 'r3'])
    expect(applyPieceSlice(rows, 3, 1).map(row => row.id)).toEqual(['r3'])
    expect(applyPieceSlice(rows, -4, 2).map(row => row.id)).toEqual(['r1', 'r2'])
  })

  it('CHK-148: formats surfaced scheduling failure message', () => {
    expect(formatSchedulingFailureAlert(new Error('engine offline'))).toBe(
      'Scheduling failed: engine offline'
    )
    expect(formatSchedulingFailureAlert('x')).toBe('Scheduling failed: Unknown scheduling error')
  })

  it('CHK-238: scheduling failure alert surfaces exact root message', () => {
    expect(formatSchedulingFailureAlert(new Error('No scheduling engine available'))).toBe(
      'Scheduling failed: No scheduling engine available'
    )
  })

  it('CHK-237: import failure formatter preserves root message', () => {
    expect(formatImportFailureAlert(new Error('bad excel shape'))).toBe(
      'Failed to import Excel file: bad excel shape'
    )
  })

  it('CHK-239: safe evaluation wrapper prevents crash and returns fallback', () => {
    const fallback = {
      issues: [
        {
          code: 'verification_exception',
          rule: 'Quality Evaluation',
          severity: 'critical' as const,
          message: 'fallback',
          entityRefs: ['x'],
        },
      ],
    }

    const result = safelyEvaluate(() => {
      throw new Error('quality blew up')
    }, fallback)

    expect(result.value).toEqual(fallback)
    expect(result.error).toBe('Verification failed: quality blew up')
  })
})
