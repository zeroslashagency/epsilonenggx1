import { BackendIntegrationService } from '@/app/lib/features/scheduling/backend-integration'
import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'

const baseSettings = {
  globalStartDateTime: '2026-02-22T06:00:00',
  globalSetupWindow: '06:00-22:00',
  productionWindowShift1: '06:00-22:00',
  productionWindowShift2: '',
  productionWindowShift3: '',
  holidays: [],
  breakdowns: [],
  personnelProfiles: [
    {
      uid: 'S1',
      name: 'Setup One',
      sourceSection: 'setup',
      levelUp: 1,
      setupEligible: true,
      productionEligible: true,
      setupPriority: 1,
    },
    {
      uid: 'P1',
      name: 'Prod One',
      sourceSection: 'production',
      levelUp: 1,
      setupEligible: true,
      productionEligible: true,
      setupPriority: 2,
    },
  ],
}

const masterData = [
  {
    PartNumber: 'PNX',
    OperationSeq: 1,
    OperationName: 'BaseOp',
    SetupTime_Min: 60,
    Operater: '',
    CycleTime_Min: 99,
    Minimum_BatchSize: 200,
    EligibleMachines: 'VMC 1,VMC 2',
  },
]

function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
}

describe('deterministic PRD checks (non-UI)', () => {
  it('CHK-131/132: schedule rows always include setup and production person names', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-131',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 40,
          priority: 'Normal',
          batchMode: 'single-batch',
        },
      ],
      baseSettings
    )

    expect(result.rows.length).toBeGreaterThan(0)
    result.rows.forEach((row: any) => {
      expect(String(row.setupPersonName || '').trim().length).toBeGreaterThan(0)
      expect(String(row.productionPersonName || '').trim().length).toBeGreaterThan(0)
    })
  })

  it('CHK-134: operationDetails override default master operation spec', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-134',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'OverrideOp',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 1,
              fixedMachine: 'VMC 2',
              eligibleMachines: ['VMC 1', 'VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      baseSettings
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].operationName).toBe('OverrideOp')
    expect(result.rows[0].machine).toBe('VMC 2')
    expect(minutesBetween(result.rows[0].runStart, result.rows[0].runEnd)).toBe(1)
  })

  it('CHK-135: minimumBatchSize affects auto-split lane decision', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)

    const lowMin = engine.runSchedule(
      [
        {
          id: 'o-135-a',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 300,
          priority: 'Normal',
          batchMode: 'auto-split',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 100,
              eligibleMachines: ['VMC 1', 'VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      baseSettings
    )

    const highMin = engine.runSchedule(
      [
        {
          id: 'o-135-b',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 300,
          priority: 'Normal',
          batchMode: 'auto-split',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 200,
              eligibleMachines: ['VMC 1', 'VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      baseSettings
    )

    const lowMinBatches = new Set(lowMin.rows.map((row: any) => row.batchId))
    const highMinBatches = new Set(highMin.rows.map((row: any) => row.batchId))
    expect(lowMinBatches.size).toBeGreaterThan(1)
    expect(highMinBatches.size).toBe(1)
  })

  it('CHK-136: customBatchSize overrides default splitting', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-136',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 200,
          priority: 'Normal',
          batchMode: 'custom-batch-size',
          customBatchSize: 70,
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1', 'VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      baseSettings
    )

    const batchQtys = result.rows
      .map((row: any) => Number(row.batchQty))
      .sort((a: number, b: number) => a - b)
    expect(batchQtys).toEqual([60, 70, 70])
  })

  it('CHK-137: priority influences dispatch ordering', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-137-low',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Low',
          batchMode: 'single-batch',
        },
        {
          id: 'o-137-urgent',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Urgent',
          batchMode: 'single-batch',
        },
      ],
      baseSettings
    )

    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows[0].priority).toBe('Urgent')
  })

  it('CHK-147: backend service throws when no scheduling engine available', async () => {
    const service = BackendIntegrationService.getInstance() as any
    service.services = {}
    service.initialized = true

    await expect(service.runSchedule([], {})).rejects.toThrow('No scheduling engine available')
  })

  it('CHK-189: mixed handle-mode schedules produce valid piece timeline rows', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-189-single',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 2,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'OpSingle',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
        {
          id: 'o-189-double',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 2,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'OpDouble',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 2'],
              handleMode: 'double',
            },
          ],
        },
      ],
      baseSettings
    )

    expect(result.pieceTimeline.length).toBeGreaterThan(0)
    result.pieceTimeline.forEach((row: any) => {
      expect(['single', 'double']).toContain(row.handleMode)
      expect(new Date(row.runEnd).getTime()).toBeGreaterThan(new Date(row.runStart).getTime())
    })
  })

  it('CHK-222: unknown handle-mode token defaults safely to single', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const result = engine.runSchedule(
      [
        {
          id: 'o-222',
          partNumber: 'PNX',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'UnknownModeOp',
              setupTimeMin: 5,
              cycleTimeMin: 1,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'TRIPLE-ALIEN-MODE',
            },
          ],
        },
      ],
      baseSettings
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].handleMode).toBe('single')
  })
})
