import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'
import { buildSchedulingWorkbook } from '@/app/lib/features/scheduling/excel-export'
import { parsePersonnelProfilesFromRows } from '@/app/lib/features/scheduling/personnel-v2'

const INPUT_FILE = '/Users/xoxo/Downloads/import_input (2).xlsx'
const RUN_ID = 'alg-quality-20260226-subagent-02'
const ARTIFACT_DIR = `/Users/xoxo/Desktop/epsilonschedulingmain 2/reports/artifacts/alg-quality/${RUN_ID}/workbooks`
const ADVANCED_OUTPUT = path.join(ARTIFACT_DIR, 'advanced_new.xlsx')
const BASIC_OUTPUT = path.join(ARTIFACT_DIR, 'basic_new.xlsx')

const ORDERS = [
  { id: 'order-pn2001', partNumber: 'PN2001', operationSeq: '1,2,3', orderQuantity: 777 },
  { id: 'order-pn31001', partNumber: 'PN31001', operationSeq: '1', orderQuantity: 999 },
]

function parseMachines(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)
}

describe('generate basic/advanced algorithm workbooks', () => {
  const runIfFileExists = fs.existsSync(INPUT_FILE) ? it : it.skip

  runIfFileExists('generates paired workbook artifacts from same input', () => {
    const workbook = XLSX.readFile(INPUT_FILE)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })

    const personnel = parsePersonnelProfilesFromRows(rows)
    expect(personnel.profiles.length).toBeGreaterThan(0)

    const masterRows = rows
      .filter(row => ORDERS.some(order => String(row.PartNumber || '').trim() === order.partNumber))
      .filter(row => Number(row.OperationSeq) > 0)
      .map(row => ({
        PartNumber: String(row.PartNumber),
        OperationSeq: Number(row.OperationSeq),
        OperationName: String(row.OperationName || 'Facing'),
        SetupTime_Min: Number(row.SetupTime_Min) || 60,
        Operater: '',
        CycleTime_Min: Number(row.CycleTime_Min) || 1,
        Minimum_BatchSize: Number(row.Minimum_BatchSize) || 1,
        EligibleMachines: String(row.EligibleMachines || 'VMC 1'),
        HandleMachines: String(row.HandleMachines || 'SINGLE MACHINE'),
      }))

    expect(masterRows.length).toBeGreaterThan(0)

    const operationDetailsByPart = new Map<string, any[]>()
    masterRows.forEach(row => {
      const list = operationDetailsByPart.get(row.PartNumber) || []
      list.push({
        operationSeq: row.OperationSeq,
        operationName: row.OperationName,
        setupTimeMin: row.SetupTime_Min,
        cycleTimeMin: row.CycleTime_Min,
        minimumBatchSize: row.Minimum_BatchSize,
        eligibleMachines: parseMachines(row.EligibleMachines),
        handleMode: String(row.HandleMachines || '')
          .toLowerCase()
          .includes('double')
          ? 'double'
          : 'single',
      })
      operationDetailsByPart.set(row.PartNumber, list)
    })

    const buildOrders = (profileMode: 'basic' | 'advanced') =>
      ORDERS.map(order => ({
        ...order,
        priority: 'Normal',
        batchMode: profileMode === 'advanced' ? 'auto-split' : 'single-batch',
        operationDetails: (operationDetailsByPart.get(order.partNumber) || []).sort(
          (a, b) => Number(a.operationSeq) - Number(b.operationSeq)
        ),
      }))

    const baseSettings = {
      globalStartDateTime: '2026-02-26T06:00:00',
      globalSetupWindow: '06:00-22:00',
      shift1: '06:00-14:00',
      shift2: '14:00-22:00',
      shift3: '22:00-06:00',
      productionWindowShift1: '06:00-14:00',
      productionWindowShift2: '14:00-22:00',
      productionWindowShift3: '22:00-06:00',
      holidays: [],
      breakdowns: [],
      personnelProfiles: personnel.profiles,
    }

    const engine = new DeterministicSchedulingEngine(masterRows as any)
    const advancedRun = engine.runSchedule(buildOrders('advanced') as any, {
      ...baseSettings,
      profileMode: 'advanced',
    })
    const basicRun = engine.runSchedule(buildOrders('basic') as any, {
      ...baseSettings,
      profileMode: 'basic',
    })

    const advancedWorkbook = buildSchedulingWorkbook({
      results: advancedRun.rows,
      holidays: [],
      breakdowns: [],
      qualityReport: { issues: [] },
      personnelProfiles: personnel.profiles,
      shiftSettings: {
        shift1: baseSettings.shift1,
        shift2: baseSettings.shift2,
        shift3: baseSettings.shift3,
        globalSetupWindow: baseSettings.globalSetupWindow,
      },
      generatedAt: new Date('2026-02-26T12:00:00.000Z'),
      profileMode: 'advanced',
    })

    const basicWorkbook = buildSchedulingWorkbook({
      results: basicRun.rows,
      holidays: [],
      breakdowns: [],
      qualityReport: { issues: [] },
      personnelProfiles: personnel.profiles,
      shiftSettings: {
        shift1: baseSettings.shift1,
        shift2: baseSettings.shift2,
        shift3: baseSettings.shift3,
        globalSetupWindow: baseSettings.globalSetupWindow,
      },
      generatedAt: new Date('2026-02-26T12:00:00.000Z'),
      profileMode: 'basic',
    })

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
    XLSX.writeFile(advancedWorkbook, ADVANCED_OUTPUT)
    XLSX.writeFile(basicWorkbook, BASIC_OUTPUT)

    expect(fs.existsSync(ADVANCED_OUTPUT)).toBe(true)
    expect(fs.existsSync(BASIC_OUTPUT)).toBe(true)

    const advRead = XLSX.readFile(ADVANCED_OUTPUT)
    const basicRead = XLSX.readFile(BASIC_OUTPUT)
    expect(advRead.SheetNames).toContain('Setup_output')
    expect(basicRead.SheetNames).not.toContain('Setup_output')
  })
})
