import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'
import type { SchedulerPersonnelProfileInput } from '@/app/lib/features/scheduling/personnel-v2'

const baseSettings = {
  globalStartDateTime: '2026-02-22T06:00:00',
  globalSetupWindow: '06:00-22:00',
  productionWindowShift1: '06:00-22:00',
  productionWindowShift2: '',
  productionWindowShift3: '',
  holidays: [],
  breakdowns: [],
}

const personnelProfiles: SchedulerPersonnelProfileInput[] = [
  {
    uid: '200',
    name: 'AA Prod',
    sourceSection: 'production',
    levelUp: 0,
    setupEligible: false,
    productionEligible: true,
    setupPriority: 1,
  },
  {
    uid: '201',
    name: 'ZZ Setup',
    sourceSection: 'setup',
    levelUp: 1,
    setupEligible: true,
    productionEligible: false,
    setupPriority: 1,
  },
]

const onePersonBothRoles: SchedulerPersonnelProfileInput[] = [
  {
    uid: '301',
    name: 'Solo Person',
    sourceSection: 'setup',
    levelUp: 1,
    setupEligible: true,
    productionEligible: true,
    setupPriority: 1,
  },
]

const buildOrders = (handleMode: 'single' | 'double') => [
  {
    id: `order-a-${handleMode}`,
    partNumber: 'PN1001',
    operationSeq: '1',
    orderQuantity: 1,
    priority: 'Normal',
    batchMode: 'single-batch',
    operationDetails: [
      {
        operationSeq: 1,
        operationName: 'Facing',
        setupTimeMin: 1,
        cycleTimeMin: 180,
        minimumBatchSize: 1,
        eligibleMachines: ['VMC 1', 'VMC 2'],
        handleMode,
      },
    ],
  },
  {
    id: `order-b-${handleMode}`,
    partNumber: 'PN2001',
    operationSeq: '1',
    orderQuantity: 1,
    priority: 'Normal',
    batchMode: 'single-batch',
    operationDetails: [
      {
        operationSeq: 1,
        operationName: 'Facing',
        setupTimeMin: 1,
        cycleTimeMin: 180,
        minimumBatchSize: 1,
        eligibleMachines: ['VMC 1', 'VMC 2'],
        handleMode,
      },
    ],
  },
]

const buildThreeDoubleOrders = () =>
  ['A', 'B', 'C'].map((suffix, index) => ({
    id: `order-${suffix}`,
    partNumber: `PN3${index + 1}01`,
    operationSeq: '1',
    orderQuantity: 1,
    priority: 'Normal',
    batchMode: 'single-batch',
    operationDetails: [
      {
        operationSeq: 1,
        operationName: 'Facing',
        setupTimeMin: 1,
        cycleTimeMin: 180,
        minimumBatchSize: 1,
        eligibleMachines: ['VMC 1', 'VMC 2', 'VMC 3'],
        handleMode: 'double' as const,
      },
    ],
  }))

const maxConcurrentIntervals = (intervals: Array<{ start: number; end: number }>): number => {
  const points: Array<{ at: number; delta: number }> = []
  intervals.forEach(interval => {
    points.push({ at: interval.start, delta: 1 })
    points.push({ at: interval.end, delta: -1 })
  })
  points.sort((a, b) => (a.at === b.at ? a.delta - b.delta : a.at - b.at))
  let current = 0
  let max = 0
  points.forEach(point => {
    current += point.delta
    if (current > max) max = current
  })
  return max
}

describe('deterministic engine HandleMachines behavior', () => {
  it('prefers production team for run when both production and setup are feasible', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-pref-prod-run',
          partNumber: 'PN7771',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Facing',
              setupTimeMin: 10,
              cycleTimeMin: 30,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        personnelProfiles: [
          {
            uid: 'p-1',
            name: 'Prod Primary',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: true,
            setupPriority: 99,
          },
          {
            uid: 's-1',
            name: 'Setup Backup',
            sourceSection: 'setup',
            levelUp: 1,
            setupEligible: true,
            productionEligible: true,
            setupPriority: 1,
          },
        ],
      }
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].productionPersonName).toBe('Prod Primary')
  })

  it('uses setup person for run only as fallback when no production candidate is eligible', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-fallback-setup-run',
          partNumber: 'PN7772',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Facing',
              setupTimeMin: 10,
              cycleTimeMin: 30,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        personnelProfiles: [
          {
            uid: 'p-2',
            name: 'Prod Disabled',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: false,
            setupPriority: 99,
          },
          {
            uid: 's-2',
            name: 'Setup Fallback',
            sourceSection: 'setup',
            levelUp: 1,
            setupEligible: true,
            productionEligible: true,
            setupPriority: 1,
          },
        ],
      }
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].productionPersonName).toBe('Setup Fallback')
  })

  it('keeps production assignment when production can start within 30-minute fallback tolerance', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-prod-busy-short',
          partNumber: 'PN7801',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 20,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
        {
          id: 'order-should-stay-prod',
          partNumber: 'PN7802',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 20,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        personnelProfiles: [
          {
            uid: 'p-3',
            name: 'Prod Busy',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: true,
            setupPriority: 99,
          },
          {
            uid: 's-3',
            name: 'Setup Can Fallback',
            sourceSection: 'setup',
            levelUp: 1,
            setupEligible: true,
            productionEligible: true,
            setupPriority: 1,
          },
        ],
      }
    )

    const second = result.rows.find((row: any) => row.id.includes('order-should-stay-prod'))
    expect(second).toBeTruthy()
    expect(second?.productionPersonName).toBe('Prod Busy')
  })

  it('uses setup fallback for run when no production candidate can start within 30 minutes', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-prod-busy-long',
          partNumber: 'PN7803',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 90,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
        {
          id: 'order-should-fallback',
          partNumber: 'PN7804',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 20,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        personnelProfiles: [
          {
            uid: 'p-4',
            name: 'Prod Busy Long',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: true,
            setupPriority: 99,
          },
          {
            uid: 's-4',
            name: 'Setup Fallback Long',
            sourceSection: 'setup',
            levelUp: 1,
            setupEligible: true,
            productionEligible: true,
            setupPriority: 1,
          },
        ],
      }
    )

    const second = result.rows.find((row: any) => row.id.includes('order-should-fallback'))
    expect(second).toBeTruthy()
    expect(second?.productionPersonName).toBe('Setup Fallback Long')
  })

  it('balances near-tie production assignment toward lower reserved run load', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'a-order-preload-heavy',
          partNumber: 'PN7901',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 40,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
        {
          id: 'z-order-load-balanced',
          partNumber: 'PN7902',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          startDateTime: '2026-02-22T10:00:00',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Op',
              setupTimeMin: 5,
              cycleTimeMin: 30,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        enforceOperatorShifts: true,
        shift1: '06:00-22:00',
        shift2: '10:00-22:00',
        shift3: '06:00-22:00',
        personnelProfiles: [
          {
            uid: 'p-5',
            name: 'AA Prod Heavy',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: true,
            setupPriority: 99,
          },
          {
            uid: 'p-6',
            name: 'ZZ Prod Light',
            sourceSection: 'production',
            levelUp: 0,
            setupEligible: false,
            productionEligible: true,
            setupPriority: 99,
          },
          {
            uid: 's-5',
            name: 'Setup Anchor',
            sourceSection: 'setup',
            levelUp: 1,
            setupEligible: true,
            productionEligible: false,
            setupPriority: 1,
          },
        ],
      }
    )

    const preload = result.rows.find((row: any) => row.id.includes('a-order-preload-heavy'))
    const balanced = result.rows.find((row: any) => row.id.includes('z-order-load-balanced'))
    expect(preload?.productionPersonName).toBe('AA Prod Heavy')
    expect(balanced?.productionPersonName).toBe('ZZ Prod Light')
  })

  it('allows overlap for double-machine runs on the same production person', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(buildOrders('double'), {
      ...baseSettings,
      personnelProfiles,
    })

    expect(result.rows).toHaveLength(2)

    const rows = [...result.rows].sort(
      (a: any, b: any) => new Date(a.runStart).getTime() - new Date(b.runStart).getTime()
    )
    expect(rows[0].productionPersonName).toBe('AA Prod')
    expect(rows[1].productionPersonName).toBe('AA Prod')
    expect(rows[0].handleMode).toBe('double')
    expect(rows[1].handleMode).toBe('double')

    const firstEnd = new Date(rows[0].runEnd).getTime()
    const secondStart = new Date(rows[1].runStart).getTime()
    expect(secondStart).toBeLessThan(firstEnd)
  })

  it('blocks overlap for single-machine runs on the same production person', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(buildOrders('single'), {
      ...baseSettings,
      personnelProfiles,
    })

    expect(result.rows).toHaveLength(2)

    const rows = [...result.rows].sort(
      (a: any, b: any) => new Date(a.runStart).getTime() - new Date(b.runStart).getTime()
    )
    expect(rows[0].handleMode).toBe('single')
    expect(rows[1].handleMode).toBe('single')
    const byPerson = new Map<string, Array<{ start: number; end: number }>>()
    rows.forEach((row: any) => {
      const key = String(row.productionPersonName || '')
      const bucket = byPerson.get(key) || []
      bucket.push({
        start: new Date(row.runStart).getTime(),
        end: new Date(row.runEnd).getTime(),
      })
      byPerson.set(key, bucket)
    })

    byPerson.forEach(intervals => {
      if (intervals.length < 2) return
      const sorted = [...intervals].sort((a, b) => a.start - b.start)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].start).toBeGreaterThanOrEqual(sorted[i - 1].end)
      }
    })
  })

  it('treats mixed single+double overlap as blocked', () => {
    const engine = new DeterministicSchedulingEngine([])
    const orders = buildOrders('double')
    orders[0].operationDetails[0].handleMode = 'single'
    orders[1].operationDetails[0].handleMode = 'double'

    const result = engine.runSchedule(orders, {
      ...baseSettings,
      personnelProfiles,
    })

    const rows = [...result.rows].sort(
      (a: any, b: any) => new Date(a.runStart).getTime() - new Date(b.runStart).getTime()
    )
    expect(rows).toHaveLength(2)
    const byPerson = new Map<string, Array<{ start: number; end: number; handleMode: string }>>()
    rows.forEach((row: any) => {
      const key = String(row.productionPersonName || '')
      const bucket = byPerson.get(key) || []
      bucket.push({
        start: new Date(row.runStart).getTime(),
        end: new Date(row.runEnd).getTime(),
        handleMode: String(row.handleMode || ''),
      })
      byPerson.set(key, bucket)
    })

    byPerson.forEach(intervals => {
      if (intervals.length < 2) return
      const sorted = [...intervals].sort((a, b) => a.start - b.start)
      for (let i = 1; i < sorted.length; i++) {
        const prior = sorted[i - 1]
        const curr = sorted[i]
        const hasSingle = prior.handleMode === 'single' || curr.handleMode === 'single'
        if (hasSingle) {
          expect(curr.start).toBeGreaterThanOrEqual(prior.end)
        }
      }
    })
  })

  it('defaults missing handle mode to single', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-default-handle',
          partNumber: 'PN3001',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Facing',
              setupTimeMin: 1,
              cycleTimeMin: 60,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
            },
          ],
        },
      ],
      {
        ...baseSettings,
        personnelProfiles,
      }
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].handleMode).toBe('single')
  })

  it('caps triple-double overlap to max two concurrent runs per person', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(buildThreeDoubleOrders(), {
      ...baseSettings,
      personnelProfiles,
    })

    const aaRows = result.rows.filter((row: any) => row.productionPersonName === 'AA Prod')
    expect(aaRows.length).toBeGreaterThanOrEqual(2)
    const intervals = aaRows.map((row: any) => ({
      start: new Date(row.runStart).getTime(),
      end: new Date(row.runEnd).getTime(),
    }))
    expect(maxConcurrentIntervals(intervals)).toBeLessThanOrEqual(2)
  })

  it('keeps setup intervals non-overlapping for same setup person', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(buildOrders('single'), {
      ...baseSettings,
      personnelProfiles,
    })

    const setupRows = result.rows
      .filter((row: any) => row.setupPersonName === 'ZZ Setup')
      .sort((a: any, b: any) => new Date(a.setupStart).getTime() - new Date(b.setupStart).getTime())

    for (let i = 1; i < setupRows.length; i++) {
      const prevEnd = new Date(setupRows[i - 1].setupEnd).getTime()
      const currStart = new Date(setupRows[i].setupStart).getTime()
      expect(currStart).toBeGreaterThanOrEqual(prevEnd)
    }
  })

  it('prevents setup-run overlap for same person', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(buildOrders('double'), {
      ...baseSettings,
      personnelProfiles: onePersonBothRoles,
    })

    const rows = [...result.rows].sort(
      (a: any, b: any) => new Date(a.setupStart).getTime() - new Date(b.setupStart).getTime()
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].setupPersonName).toBe('Solo Person')
    expect(rows[1].setupPersonName).toBe('Solo Person')
    expect(rows[0].productionPersonName).toBe('Solo Person')
    expect(rows[1].productionPersonName).toBe('Solo Person')

    const firstRunEnd = new Date(rows[0].runEnd).getTime()
    const secondSetupStart = new Date(rows[1].setupStart).getTime()
    expect(secondSetupStart).toBeGreaterThanOrEqual(firstRunEnd)
  })

  it('avoids assigning blocked machine during active breakdown', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-breakdown',
          partNumber: 'PN9001',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Facing',
              setupTimeMin: 10,
              cycleTimeMin: 20,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1', 'VMC 2'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        breakdowns: [
          {
            machines: ['VMC 1'],
            startDateTime: '2026-02-22T06:00:00',
            endDateTime: '2026-02-22T20:00:00',
          },
        ],
        personnelProfiles,
      }
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].machine).toBe('VMC 2')
  })

  it('respects holiday blocking for setup and run', () => {
    const engine = new DeterministicSchedulingEngine([])
    const result = engine.runSchedule(
      [
        {
          id: 'order-holiday',
          partNumber: 'PN9101',
          operationSeq: '1',
          orderQuantity: 1,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: [
            {
              operationSeq: 1,
              operationName: 'Facing',
              setupTimeMin: 30,
              cycleTimeMin: 30,
              minimumBatchSize: 1,
              eligibleMachines: ['VMC 1'],
              handleMode: 'single',
            },
          ],
        },
      ],
      {
        ...baseSettings,
        holidays: [
          {
            startDateTime: '2026-02-22T00:00:00',
            endDateTime: '2026-02-23T00:00:00',
            reason: 'Holiday',
          },
        ],
        personnelProfiles,
      }
    )

    expect(result.rows).toHaveLength(1)
    const setupStart = new Date(result.rows[0].setupStart)
    const runStart = new Date(result.rows[0].runStart)
    expect(setupStart.getTime()).toBeGreaterThanOrEqual(new Date('2026-02-23T00:00:00').getTime())
    expect(runStart.getTime()).toBeGreaterThanOrEqual(new Date('2026-02-23T00:00:00').getTime())
  })
})
