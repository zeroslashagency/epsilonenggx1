import { verifyPieceFlow } from '@/app/lib/features/scheduling/piece-flow-verifier'

describe('piece flow verifier handle-mode checks', () => {
  it('allows double+double overlap for same person', () => {
    const report = verifyPieceFlow([
      {
        id: 'a',
        partNumber: 'PN1',
        batchId: 'B01',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 1',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:00:00',
        runEnd: '2026-02-22T08:00:00',
      },
      {
        id: 'b',
        partNumber: 'PN2',
        batchId: 'B02',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 2',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:30:00',
        runEnd: '2026-02-22T07:30:00',
      },
    ])

    const capacityIssues = report.issues.filter(
      issue =>
        issue.code === 'PERSON_RUN_CAPACITY_EXCEEDED' || issue.code === 'PERSON_SINGLE_MODE_OVERLAP'
    )
    expect(capacityIssues).toHaveLength(0)
  })

  it('flags single overlap for same person', () => {
    const report = verifyPieceFlow([
      {
        id: 'a',
        partNumber: 'PN1',
        batchId: 'B01',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 1',
        person: 'AA Prod',
        handleMode: 'single',
        runStart: '2026-02-22T06:00:00',
        runEnd: '2026-02-22T08:00:00',
      },
      {
        id: 'b',
        partNumber: 'PN2',
        batchId: 'B02',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 2',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:30:00',
        runEnd: '2026-02-22T07:30:00',
      },
    ])

    expect(report.issues.some(issue => issue.code === 'PERSON_SINGLE_MODE_OVERLAP')).toBe(true)
  })

  it('flags capacity exceeded when three doubles overlap', () => {
    const report = verifyPieceFlow([
      {
        id: 'a',
        partNumber: 'PN1',
        batchId: 'B01',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 1',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:00:00',
        runEnd: '2026-02-22T08:00:00',
      },
      {
        id: 'b',
        partNumber: 'PN2',
        batchId: 'B02',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 2',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:15:00',
        runEnd: '2026-02-22T07:45:00',
      },
      {
        id: 'c',
        partNumber: 'PN3',
        batchId: 'B03',
        piece: 1,
        operationSeq: 1,
        machine: 'VMC 3',
        person: 'AA Prod',
        handleMode: 'double',
        runStart: '2026-02-22T06:30:00',
        runEnd: '2026-02-22T07:30:00',
      },
    ])

    expect(report.issues.some(issue => issue.code === 'PERSON_RUN_CAPACITY_EXCEEDED')).toBe(true)
  })
})
