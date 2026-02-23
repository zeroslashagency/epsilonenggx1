import fs from 'node:fs'
import * as XLSX from 'xlsx'

import { parsePersonnelProfilesFromRows } from '@/app/lib/features/scheduling/personnel-v2'
import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'

const FILE_PATH = '/Users/xoxo/Downloads/import_input.xlsx'
const runIfFileExists = fs.existsSync(FILE_PATH) ? it : it.skip

describe('import_input.xlsx integration', () => {
  runIfFileExists('parses production/setup blocks and schedules with real names', () => {
    const workbook = XLSX.readFile(FILE_PATH)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })

    const personnelParsed = parsePersonnelProfilesFromRows(objectRows)
    expect(personnelParsed.summary.productionRowsDetected).toBe(4)
    expect(personnelParsed.summary.setupRowsDetected).toBe(4)
    expect(personnelParsed.profiles).toHaveLength(8)
    expect(personnelParsed.issues.some(issue => issue.code === 'schema_marker_row')).toBe(true)

    const allNames = new Set(personnelParsed.profiles.map(profile => profile.name))

    const masterRows = objectRows
      .filter(row => String(row.PartNumber || '').trim() === 'PN1001')
      .map(row => ({
        PartNumber: String(row.PartNumber),
        OperationSeq: Number(row.OperationSeq),
        OperationName: String(row.OperationName || 'Facing'),
        SetupTime_Min: Number(row.SetupTime_Min) || 60,
        Operater: '',
        CycleTime_Min: Number(row.CycleTime_Min) || 1,
        Minimum_BatchSize: Number(row.Minimum_BatchSize) || 1,
        EligibleMachines: String(row.EligibleMachines || 'VMC 1'),
        HandleMachines: String((row as any).HandleMachines || 'SINGLE MACHINE'),
      }))

    const engine = new DeterministicSchedulingEngine(masterRows as any)
    const startedAt = Date.now()
    const result = engine.runSchedule(
      [
        {
          id: 'it-order-1',
          partNumber: 'PN1001',
          operationSeq: '1,2,3,4',
          orderQuantity: 200,
          priority: 'Normal',
          batchMode: 'single-batch',
          operationDetails: masterRows.map(row => ({
            operationSeq: row.OperationSeq,
            operationName: row.OperationName,
            setupTimeMin: row.SetupTime_Min,
            cycleTimeMin: row.CycleTime_Min,
            minimumBatchSize: row.Minimum_BatchSize,
            eligibleMachines: row.EligibleMachines.split(',').map(machine => machine.trim()).filter(Boolean),
            handleMode: String((row as any).HandleMachines || '')
              .toLowerCase()
              .includes('double')
              ? 'double'
              : 'single',
          })),
        },
      ],
      {
        globalStartDateTime: '2026-02-22T06:00:00',
        globalSetupWindow: '06:00-22:00',
        productionWindowShift1: '06:00-22:00',
        productionWindowShift2: '',
        productionWindowShift3: '',
        holidays: [],
        breakdowns: [],
        personnelProfiles: personnelParsed.profiles,
      }
    )
    const elapsedMs = Date.now() - startedAt

    expect(result.rows.length).toBeGreaterThan(0)
    expect(elapsedMs).toBeLessThan(5000)

    const setupOnlyNames = new Set(['Kannan', 'Rajesh', 'shajahan', 'Anil Ram'])
    const productionLevel0Names = new Set(['Employee 45', 'Deepak Patel', 'Ramakrishnan'])
    let hasSetupTeamAssignment = false

    result.rows.forEach((row: any) => {
      expect(['A', 'B', 'C', 'D']).not.toContain(row.person)
      expect(allNames.has(row.setupPersonName)).toBe(true)
      expect(allNames.has(row.productionPersonName)).toBe(true)
      expect(['single', 'double']).toContain(row.handleMode)
      if (setupOnlyNames.has(row.setupPersonName)) hasSetupTeamAssignment = true
      expect(productionLevel0Names.has(row.setupPersonName)).toBe(false)
    })
    expect(hasSetupTeamAssignment).toBe(true)
  })
})
