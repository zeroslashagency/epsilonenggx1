import {
  parsePersonnelProfilesFromRows,
  SchedulerPersonnelProfileInput,
} from '@/app/lib/features/scheduling/personnel-v2'
import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'

describe('personnel v2 parser', () => {
  it('parses production and setup sections as separate pools', () => {
    const rawRows = [
      {
        PartNumber: 'PN1001',
        OperationSeq: 1,
        'Production-Person': 'Production-Person',
        uid: 'uid',
        Name: 'Name',
        'level-up': 'level-up',
      },
      {
        PartNumber: 'PN1001',
        OperationSeq: 2,
        'Production-Person': '',
        uid: 23,
        Name: 'Sivakumar C',
        'level-up': 1,
      },
      {
        PartNumber: 'PN1001',
        OperationSeq: 3,
        'Production-Person': '',
        uid: 45,
        Name: 'Employee 45',
        'level-up': 0,
      },
      {
        PartNumber: 'PN1001',
        OperationSeq: 4,
        'Production-Person': 'Setup-person',
        uid: 'uid',
        Name: 'Name',
        'level-up': 'level-up',
      },
      {
        PartNumber: 'PN1001',
        OperationSeq: 5,
        'Production-Person': '',
        uid: 16,
        Name: 'Kannan',
        'level-up': 1,
      },
    ] as Array<Record<string, unknown>>

    const parsed = parsePersonnelProfilesFromRows(rawRows)

    expect(parsed.summary.productionRowsDetected).toBe(2)
    expect(parsed.summary.setupRowsDetected).toBe(1)
    expect(parsed.profiles).toHaveLength(3)

    const productionL1 = parsed.profiles.find(profile => profile.uid === '23')
    const productionL0 = parsed.profiles.find(profile => profile.uid === '45')
    const setup = parsed.profiles.find(profile => profile.uid === '16')

    expect(productionL1?.setupEligible).toBe(true)
    expect(productionL0?.setupEligible).toBe(false)
    expect(setup?.sourceSection).toBe('setup')
    expect(setup?.setupPriority).toBe(1)
  })
})

describe('deterministic engine personnel assignment', () => {
  const masterData = [
    {
      PartNumber: 'PN1001',
      OperationSeq: 1,
      OperationName: 'Facing',
      SetupTime_Min: 20,
      Operater: '',
      CycleTime_Min: 2,
      Minimum_BatchSize: 10,
      EligibleMachines: 'VMC 1,VMC 2',
    },
  ]

  const baseOrder = [
    {
      id: 'order-1',
      partNumber: 'PN1001',
      operationSeq: '1',
      orderQuantity: 20,
      priority: 'Normal',
      batchMode: 'single-batch',
    },
  ]

  const baseSettings = {
    globalStartDateTime: '2026-02-22T06:00:00',
    globalSetupWindow: '06:00-22:00',
    productionWindowShift1: '06:00-22:00',
    productionWindowShift2: '',
    productionWindowShift3: '',
    holidays: [],
    breakdowns: [],
  }

  it('uses provided real names instead of legacy A/B/C/D', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const personnelProfiles: SchedulerPersonnelProfileInput[] = [
      {
        uid: '16',
        name: 'Kannan',
        sourceSection: 'setup',
        levelUp: 1,
        setupEligible: true,
        productionEligible: true,
        setupPriority: 1,
      },
      {
        uid: '23',
        name: 'Sivakumar C',
        sourceSection: 'production',
        levelUp: 1,
        setupEligible: true,
        productionEligible: true,
        setupPriority: 2,
      },
    ]

    const result = engine.runSchedule(baseOrder, {
      ...baseSettings,
      personnelProfiles,
    })

    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(['A', 'B', 'C', 'D']).not.toContain(row.person)
    expect(['Kannan', 'Sivakumar C']).toContain(row.setupPersonName)
    expect(['Kannan', 'Sivakumar C']).toContain(row.productionPersonName)
  })

  it('falls back to production level-up=1 for setup when setup pool is absent', () => {
    const engine = new DeterministicSchedulingEngine(masterData as any)
    const personnelProfiles: SchedulerPersonnelProfileInput[] = [
      {
        uid: '23',
        name: 'Sivakumar C',
        sourceSection: 'production',
        levelUp: 1,
        setupEligible: true,
        productionEligible: true,
        setupPriority: 2,
      },
      {
        uid: '45',
        name: 'Employee 45',
        sourceSection: 'production',
        levelUp: 0,
        setupEligible: false,
        productionEligible: true,
        setupPriority: 99,
      },
    ]

    const result = engine.runSchedule(baseOrder, {
      ...baseSettings,
      personnelProfiles,
    })

    const row = result.rows[0]
    expect(row.setupPersonName).toBe('Sivakumar C')
    expect(['Sivakumar C', 'Employee 45']).toContain(row.productionPersonName)
  })
})
