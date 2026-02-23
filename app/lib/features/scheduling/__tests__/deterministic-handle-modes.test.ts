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
