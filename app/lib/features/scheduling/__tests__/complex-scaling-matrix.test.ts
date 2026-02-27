import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

import { DeterministicSchedulingEngine } from '@/app/lib/features/scheduling/deterministic-scheduling-engine'
import { buildSchedulingWorkbook } from '@/app/lib/features/scheduling/excel-export'
import type { SchedulerPersonnelProfileInput } from '@/app/lib/features/scheduling/personnel-v2'

type ProfileMode = 'basic' | 'advanced'
type ScenarioSize = 'small' | 'medium' | 'large'

interface OperationTemplate {
  operationSeq: number
  operationName: string
  setupTimeMin: number
  cycleTimeMin: number
  minimumBatchSize: number
  eligibleMachines: string[]
  handleMode: 'single' | 'double'
}

interface PartTemplate {
  partBase: string
  quantity: number
  priority: 'Urgent' | 'High' | 'Normal' | 'Low'
  batchMode: 'single-batch' | 'auto-split' | 'custom-batch-size'
  customBatchSize?: number
  expectedLanes: number
  operations: OperationTemplate[]
}

interface ScenarioOrder {
  id: string
  partNumber: string
  orderQuantity: number
  batchMode: PartTemplate['batchMode']
  customBatchSize?: number
  expectedLanes: number
  operations: OperationTemplate[]
  priority: PartTemplate['priority']
}

interface ScenarioMetric {
  scenarioKey: string
  size: ScenarioSize
  profileMode: ProfileMode
  personnelTotal: number
  productionPersonnel: number
  setupPersonnel: number
  orderCount: number
  rowCount: number
  pieceCount: number
  runtimeMs: number
  setupEvents: number
  runEvents: number
  runMinutes: number
  setupMinutes: number
  uniquePeople: number
  uniqueMachines: number
  workbookPath: string
}

const PART_TEMPLATES: PartTemplate[] = [
  {
    partBase: 'PN-A',
    quantity: 10,
    priority: 'Normal',
    batchMode: 'single-batch',
    expectedLanes: 1,
    operations: [
      {
        operationSeq: 1,
        operationName: 'Facing',
        setupTimeMin: 12,
        cycleTimeMin: 4,
        minimumBatchSize: 5,
        eligibleMachines: ['VMC 1', 'VMC 2'],
        handleMode: 'single',
      },
      {
        operationSeq: 2,
        operationName: 'Drill',
        setupTimeMin: 10,
        cycleTimeMin: 3,
        minimumBatchSize: 5,
        eligibleMachines: ['VMC 2', 'VMC 3'],
        handleMode: 'single',
      },
    ],
  },
  {
    partBase: 'PN-B',
    quantity: 25,
    priority: 'High',
    batchMode: 'custom-batch-size',
    customBatchSize: 6,
    expectedLanes: 5,
    operations: [
      {
        operationSeq: 1,
        operationName: 'Turning',
        setupTimeMin: 14,
        cycleTimeMin: 5,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 3', 'VMC 4'],
        handleMode: 'single',
      },
      {
        operationSeq: 2,
        operationName: 'Finish Bore',
        setupTimeMin: 8,
        cycleTimeMin: 4,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 4', 'VMC 5'],
        handleMode: 'single',
      },
      {
        operationSeq: 3,
        operationName: 'Deburr',
        setupTimeMin: 6,
        cycleTimeMin: 3,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 5', 'VMC 6'],
        handleMode: 'double',
      },
    ],
  },
  {
    partBase: 'PN-C',
    quantity: 5,
    priority: 'Normal',
    batchMode: 'single-batch',
    expectedLanes: 1,
    operations: [
      {
        operationSeq: 1,
        operationName: 'Slot Mill',
        setupTimeMin: 9,
        cycleTimeMin: 4,
        minimumBatchSize: 2,
        eligibleMachines: ['VMC 5', 'VMC 6'],
        handleMode: 'double',
      },
    ],
  },
  {
    partBase: 'PN-D',
    quantity: 6,
    priority: 'Low',
    batchMode: 'auto-split',
    expectedLanes: 1,
    operations: [
      {
        operationSeq: 1,
        operationName: 'Rough Mill',
        setupTimeMin: 11,
        cycleTimeMin: 5,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 1', 'VMC 6'],
        handleMode: 'single',
      },
      {
        operationSeq: 2,
        operationName: 'Semi Finish',
        setupTimeMin: 9,
        cycleTimeMin: 4,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 2', 'VMC 6'],
        handleMode: 'single',
      },
      {
        operationSeq: 3,
        operationName: 'Finish',
        setupTimeMin: 7,
        cycleTimeMin: 4,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 3', 'VMC 6'],
        handleMode: 'single',
      },
      {
        operationSeq: 4,
        operationName: 'QC Touchup',
        setupTimeMin: 6,
        cycleTimeMin: 3,
        minimumBatchSize: 4,
        eligibleMachines: ['VMC 4', 'VMC 6'],
        handleMode: 'single',
      },
    ],
  },
  {
    partBase: 'PN-E',
    quantity: 3,
    priority: 'Urgent',
    batchMode: 'single-batch',
    expectedLanes: 1,
    operations: [
      {
        operationSeq: 1,
        operationName: 'Keyway',
        setupTimeMin: 8,
        cycleTimeMin: 2,
        minimumBatchSize: 1,
        eligibleMachines: ['VMC 7', 'VMC 8'],
        handleMode: 'single',
      },
      {
        operationSeq: 2,
        operationName: 'Polish',
        setupTimeMin: 5,
        cycleTimeMin: 2,
        minimumBatchSize: 1,
        eligibleMachines: ['VMC 8', 'VMC 7'],
        handleMode: 'single',
      },
    ],
  },
  {
    partBase: 'PN-F',
    quantity: 100,
    priority: 'High',
    batchMode: 'auto-split',
    expectedLanes: 2,
    operations: [
      {
        operationSeq: 1,
        operationName: 'High Volume Rough',
        setupTimeMin: 15,
        cycleTimeMin: 2,
        minimumBatchSize: 20,
        eligibleMachines: ['VMC 9', 'VMC 10'],
        handleMode: 'single',
      },
      {
        operationSeq: 2,
        operationName: 'High Volume Finish',
        setupTimeMin: 12,
        cycleTimeMin: 2,
        minimumBatchSize: 20,
        eligibleMachines: ['VMC 9', 'VMC 10'],
        handleMode: 'double',
      },
      {
        operationSeq: 3,
        operationName: 'Final Touch',
        setupTimeMin: 10,
        cycleTimeMin: 2,
        minimumBatchSize: 20,
        eligibleMachines: ['VMC 10', 'VMC 9'],
        handleMode: 'single',
      },
    ],
  },
]

const runtimeUpperBoundBySize: Record<ScenarioSize, number> = {
  small: 10_000,
  medium: 18_000,
  large: 45_000,
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value || '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function buildChunkedBatches(orderQty: number, customBatchSize: number): number[] {
  const quantities: number[] = []
  let remaining = orderQty
  while (remaining > 0) {
    const nextQty = Math.min(customBatchSize, remaining)
    quantities.push(nextQty)
    remaining -= nextQty
  }
  return quantities
}

function buildPersonnelProfiles(total: 8 | 50): SchedulerPersonnelProfileInput[] {
  const half = total / 2
  const production = Array.from({ length: half }, (_, index) => {
    const n = index + 1
    return {
      uid: `P-${String(n).padStart(3, '0')}`,
      name: `prod-${n}`,
      sourceSection: 'production' as const,
      levelUp: 0,
      setupEligible: false,
      productionEligible: true,
      setupPriority: 99,
    }
  })

  const setup = Array.from({ length: half }, (_, index) => {
    const n = index + 1
    return {
      uid: `S-${String(n).padStart(3, '0')}`,
      name: `setup-${n}`,
      sourceSection: 'setup' as const,
      levelUp: 1,
      setupEligible: true,
      productionEligible: true,
      setupPriority: n,
    }
  })

  return [...production, ...setup]
}

function buildScenarioOrders(size: ScenarioSize): ScenarioOrder[] {
  const templates = size === 'small' ? PART_TEMPLATES.slice(0, 2) : PART_TEMPLATES
  const repeats = size === 'large' ? 3 : 1
  const orders: ScenarioOrder[] = []
  let counter = 1

  for (let repeat = 0; repeat < repeats; repeat += 1) {
    const suffix = repeat === 0 ? '' : `-R${repeat + 1}`
    templates.forEach(template => {
      orders.push({
        id: `ORD-${String(counter).padStart(3, '0')}`,
        partNumber: `${template.partBase}${suffix}`,
        orderQuantity: template.quantity,
        batchMode: template.batchMode,
        customBatchSize: template.customBatchSize,
        expectedLanes: template.expectedLanes,
        operations: template.operations.map(operation => ({ ...operation })),
        priority: template.priority,
      })
      counter += 1
    })
  }

  return orders
}

function toEngineOrders(orders: ScenarioOrder[]): Array<Record<string, unknown>> {
  return orders.map(order => ({
    id: order.id,
    partNumber: order.partNumber,
    operationSeq: order.operations.map(op => op.operationSeq).join(','),
    orderQuantity: order.orderQuantity,
    priority: order.priority,
    batchMode: order.batchMode,
    customBatchSize: order.customBatchSize,
    operationDetails: order.operations.map(op => ({ ...op })),
  }))
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}`
}

describe('complex small->big matrix (basic + advanced, 8 vs 50 personnel)', () => {
  jest.setTimeout(120_000)

  it('validates behavior and exports detailed artifacts for mixed-part workloads', () => {
    const runId = `complex-matrix-${new Date().toISOString().replace(/[:.]/g, '-')}`
    const artifactRoot = path.join(process.cwd(), 'reports', 'artifacts', 'alg-quality', runId)
    const workbookRoot = path.join(artifactRoot, 'workbooks')
    fs.mkdirSync(workbookRoot, { recursive: true })

    const scenarios: Array<{
      size: ScenarioSize
      personnelTotal: 8 | 50
      profileMode: ProfileMode
    }> = [
      { size: 'small', personnelTotal: 8, profileMode: 'basic' },
      { size: 'small', personnelTotal: 8, profileMode: 'advanced' },
      { size: 'small', personnelTotal: 50, profileMode: 'basic' },
      { size: 'small', personnelTotal: 50, profileMode: 'advanced' },
      { size: 'medium', personnelTotal: 8, profileMode: 'basic' },
      { size: 'medium', personnelTotal: 8, profileMode: 'advanced' },
      { size: 'medium', personnelTotal: 50, profileMode: 'basic' },
      { size: 'medium', personnelTotal: 50, profileMode: 'advanced' },
      { size: 'large', personnelTotal: 8, profileMode: 'basic' },
      { size: 'large', personnelTotal: 8, profileMode: 'advanced' },
      { size: 'large', personnelTotal: 50, profileMode: 'basic' },
      { size: 'large', personnelTotal: 50, profileMode: 'advanced' },
    ]

    const metrics: ScenarioMetric[] = []

    scenarios.forEach(scenario => {
      const personnelProfiles = buildPersonnelProfiles(scenario.personnelTotal)
      const orders = buildScenarioOrders(scenario.size)
      const engineOrders = toEngineOrders(orders)
      const setupNames = new Set(
        personnelProfiles
          .filter(profile => profile.sourceSection === 'setup')
          .map(profile => profile.name)
      )
      const productionNames = new Set(
        personnelProfiles
          .filter(profile => profile.sourceSection === 'production')
          .map(profile => profile.name)
      )

      const engine = new DeterministicSchedulingEngine([])
      const scheduleSettings = {
        globalStartDateTime: '2026-03-01T06:00:00',
        globalSetupWindow: '00:00-23:59',
        shift1: '00:00-23:59',
        shift2: '',
        shift3: '',
        productionWindowShift1: '00:00-23:59',
        productionWindowShift2: '',
        productionWindowShift3: '',
        holidays: [],
        breakdowns: [],
        personnelProfiles,
        profileMode: scenario.profileMode,
      }

      const startedAt = Date.now()
      const scheduleResult = engine.runSchedule(engineOrders, scheduleSettings)
      const runtimeMs = Date.now() - startedAt

      expect(runtimeMs).toBeLessThan(runtimeUpperBoundBySize[scenario.size])
      expect(scheduleResult.rows.length).toBeGreaterThan(0)
      expect(scheduleResult.pieceTimeline.length).toBeGreaterThan(0)

      const workbook = buildSchedulingWorkbook({
        results: scheduleResult.rows,
        holidays: [],
        breakdowns: [],
        qualityReport: { issues: [] },
        personnelProfiles,
        shiftSettings: {
          shift1: scheduleSettings.shift1,
          shift2: scheduleSettings.shift2,
          shift3: scheduleSettings.shift3,
          globalSetupWindow: scheduleSettings.globalSetupWindow,
        },
        generatedAt: new Date('2026-03-01T12:00:00.000Z'),
        profileMode: scenario.profileMode,
      })

      if (scenario.profileMode === 'advanced') {
        expect(workbook.SheetNames).toContain('Setup_output')
      } else {
        expect(workbook.SheetNames).not.toContain('Setup_output')
      }
      expect(workbook.SheetNames).toContain('Personnel_Daily_Full')
      expect(workbook.SheetNames).toContain('Utilization_Summary')

      const workbookPath = path.join(
        workbookRoot,
        `${scenario.size}_${scenario.personnelTotal}_${scenario.profileMode}.xlsx`
      )
      XLSX.writeFile(workbook, workbookPath)

      orders.forEach(order => {
        const opSeqs = order.operations.map(op => op.operationSeq)
        const firstOp = Math.min(...opSeqs)
        const firstOpRows = scheduleResult.rows.filter(
          row => String(row.partNumber) === order.partNumber && Number(row.operationSeq) === firstOp
        )

        expect(firstOpRows.length).toBeGreaterThan(0)
        expect(firstOpRows.reduce((sum, row) => sum + toNumber(row.batchQty), 0)).toBe(
          order.orderQuantity
        )

        const firstOpBatchIds = Array.from(new Set(firstOpRows.map(row => String(row.batchId))))

        if (order.batchMode === 'single-batch') {
          expect(firstOpBatchIds).toHaveLength(1)
        }

        if (order.batchMode === 'auto-split') {
          expect(firstOpBatchIds).toHaveLength(order.expectedLanes)
        }

        if (order.batchMode === 'custom-batch-size' && order.customBatchSize) {
          const actualQtys = firstOpRows.map(row => toNumber(row.batchQty)).sort((a, b) => a - b)
          const expectedQtys = buildChunkedBatches(order.orderQuantity, order.customBatchSize).sort(
            (a, b) => a - b
          )
          expect(actualQtys).toEqual(expectedQtys)
          expect(firstOpBatchIds).toHaveLength(expectedQtys.length)
        }

        opSeqs.forEach(seq => {
          const opRows = scheduleResult.rows.filter(
            row => String(row.partNumber) === order.partNumber && Number(row.operationSeq) === seq
          )
          expect(opRows.reduce((sum, row) => sum + toNumber(row.batchQty), 0)).toBe(
            order.orderQuantity
          )

          const opBatchIds = new Set(opRows.map(row => String(row.batchId)))
          expect(opBatchIds.size).toBe(firstOpBatchIds.length)
        })
      })

      const pieceGroups = new Map<string, Array<Record<string, unknown>>>()
      scheduleResult.pieceTimeline.forEach(piece => {
        const key = `${piece.partNumber}|${piece.batchId}|${piece.piece}`
        const bucket = pieceGroups.get(key) || []
        bucket.push(piece)
        pieceGroups.set(key, bucket)
      })

      pieceGroups.forEach(group => {
        const sorted = group
          .slice()
          .sort((a, b) => toNumber(a.operationSeq) - toNumber(b.operationSeq))
        for (let index = 1; index < sorted.length; index += 1) {
          const prev = sorted[index - 1]
          const curr = sorted[index]
          expect(toNumber(curr.operationSeq)).toBeGreaterThan(toNumber(prev.operationSeq))
          expect(new Date(String(curr.runStart)).getTime()).toBeGreaterThanOrEqual(
            new Date(String(prev.runEnd)).getTime()
          )
        }
      })

      if (scenario.profileMode === 'basic') {
        expect(
          scheduleResult.rows.every(
            row => !setupNames.has(String(row.productionPersonName || row.person || ''))
          )
        ).toBe(true)
      } else {
        expect(
          scheduleResult.rows.some(row => setupNames.has(String(row.setupPersonName || '')))
        ).toBe(true)
        expect(
          scheduleResult.rows.some(row =>
            productionNames.has(String(row.productionPersonName || ''))
          )
        ).toBe(true)
      }

      const eventRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets.Personnel_Event_Log,
        {
          defval: '',
          raw: false,
        }
      )
      const dailyRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets.Personnel_Daily_Full,
        {
          defval: '',
          raw: false,
        }
      )
      const utilRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets.Utilization_Summary,
        {
          defval: '',
          raw: false,
        }
      )

      const setupEvents = eventRows.filter(
        row => String(row.Activity_Type || '').toUpperCase() === 'SETUP'
      )
      const runEvents = eventRows.filter(
        row => String(row.Activity_Type || '').toUpperCase() === 'RUN'
      )

      const eventRunMinutes = runEvents.reduce((sum, row) => sum + toNumber(row.Duration_Min), 0)
      const eventSetupMinutes = setupEvents.reduce(
        (sum, row) => sum + toNumber(row.Duration_Min),
        0
      )
      const dailyRunMinutes = dailyRows.reduce((sum, row) => sum + toNumber(row.RUN), 0)
      const dailySetupMinutes = dailyRows.reduce((sum, row) => sum + toNumber(row.SETUP), 0)
      const utilRunMinutes = utilRows.reduce((sum, row) => sum + toNumber(row.Run_Min), 0)
      const utilSetupMinutes = utilRows.reduce((sum, row) => sum + toNumber(row.Setup_Min), 0)
      const dailyEventCount = dailyRows.reduce((sum, row) => sum + toNumber(row.Event_Count), 0)
      const utilEventCount = utilRows.reduce((sum, row) => sum + toNumber(row.Events), 0)

      expect(eventRunMinutes).toBe(dailyRunMinutes)
      expect(eventRunMinutes).toBe(utilRunMinutes)
      expect(eventSetupMinutes).toBe(dailySetupMinutes)
      expect(eventSetupMinutes).toBe(utilSetupMinutes)
      expect(eventRows.length).toBe(dailyEventCount)
      expect(eventRows.length).toBe(utilEventCount)

      if (scenario.profileMode === 'basic') {
        expect(setupEvents.length).toBe(0)
        expect(dailySetupMinutes).toBe(0)
        expect(utilSetupMinutes).toBe(0)
      } else {
        expect(setupEvents.length).toBeGreaterThan(0)
        expect(dailySetupMinutes).toBeGreaterThan(0)
        expect(utilSetupMinutes).toBeGreaterThan(0)
      }

      const uniquePeople = new Set(
        eventRows.map(row => String(row.Name || '').trim()).filter(Boolean)
      ).size
      const uniqueMachines = new Set(
        scheduleResult.rows.map(row => String(row.machine || '').trim()).filter(Boolean)
      ).size

      metrics.push({
        scenarioKey: `${scenario.size}|${scenario.personnelTotal}|${scenario.profileMode}`,
        size: scenario.size,
        profileMode: scenario.profileMode,
        personnelTotal: scenario.personnelTotal,
        productionPersonnel: scenario.personnelTotal / 2,
        setupPersonnel: scenario.personnelTotal / 2,
        orderCount: orders.length,
        rowCount: scheduleResult.rows.length,
        pieceCount: scheduleResult.pieceTimeline.length,
        runtimeMs,
        setupEvents: setupEvents.length,
        runEvents: runEvents.length,
        runMinutes: eventRunMinutes,
        setupMinutes: eventSetupMinutes,
        uniquePeople,
        uniqueMachines,
        workbookPath,
      })
    })

    const summary = {
      runId,
      generatedAt: new Date().toISOString(),
      matrix: {
        sizes: ['small', 'medium', 'large'],
        personnelVariants: [8, 50],
        profileModes: ['basic', 'advanced'],
        partQuantities: [10, 25, 5, 6, 3, 100],
      },
      metrics,
    }

    const summaryPath = path.join(artifactRoot, 'metrics.json')
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8')

    const header =
      '| Scenario | Mode | Personnel | Orders | Rows | Pieces | RunEvents | SetupEvents | RunMin | SetupMin | Runtime(ms) | People Used | Machines |'
    const divider =
      '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
    const lines = metrics.map(metric => {
      return `| ${metric.size} | ${metric.profileMode} | ${metric.personnelTotal} (${metric.productionPersonnel}/${metric.setupPersonnel}) | ${metric.orderCount} | ${metric.rowCount} | ${metric.pieceCount} | ${metric.runEvents} | ${metric.setupEvents} | ${metric.runMinutes} | ${metric.setupMinutes} | ${metric.runtimeMs} | ${metric.uniquePeople} | ${metric.uniqueMachines} |`
    })

    const averagesBySize = (size: ScenarioSize, mode: ProfileMode) => {
      const subset = metrics.filter(metric => metric.size === size && metric.profileMode === mode)
      const runtimeAvg =
        subset.reduce((sum, metric) => sum + metric.runtimeMs, 0) / Math.max(1, subset.length)
      const setupMinAvg =
        subset.reduce((sum, metric) => sum + metric.setupMinutes, 0) / Math.max(1, subset.length)
      const runMinAvg =
        subset.reduce((sum, metric) => sum + metric.runMinutes, 0) / Math.max(1, subset.length)
      return { runtimeAvg, setupMinAvg, runMinAvg }
    }

    const trendLines: string[] = []
    ;(['small', 'medium', 'large'] as ScenarioSize[]).forEach(size => {
      const basicAvg = averagesBySize(size, 'basic')
      const advancedAvg = averagesBySize(size, 'advanced')
      const runtimeDeltaPct =
        basicAvg.runtimeAvg > 0
          ? ((advancedAvg.runtimeAvg - basicAvg.runtimeAvg) / basicAvg.runtimeAvg) * 100
          : 0
      trendLines.push(
        `- ${size}: avg runtime basic=${formatPercent(basicAvg.runtimeAvg)}ms, advanced=${formatPercent(advancedAvg.runtimeAvg)}ms (delta ${formatPercent(runtimeDeltaPct)}%), setupMin basic=${formatPercent(basicAvg.setupMinAvg)}, advanced=${formatPercent(advancedAvg.setupMinAvg)}, runMin basic=${formatPercent(basicAvg.runMinAvg)}, advanced=${formatPercent(advancedAvg.runMinAvg)}`
      )
    })

    const markdown = [
      '# Complex Small-to-Big Matrix Report',
      '',
      `Run ID: ${runId}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Scenario Matrix',
      '- Part order quantities: 10, 25, 5, 6, 3, 100',
      '- Personnel variants: 8 (4 production / 4 setup), 50 (25 production / 25 setup)',
      '- Modes: basic and advanced',
      '- Size levels: small, medium, large',
      '',
      '## Results Table',
      header,
      divider,
      ...lines,
      '',
      '## Trend Analysis',
      ...trendLines,
      '',
      '## Key Findings',
      '- Basic mode produces zero setup events/minutes and excludes Setup_output; advanced mode consistently emits setup events/minutes and includes Setup_output.',
      '- Quantity conservation passed for every part and operation: sum(batchQty) equals orderQuantity.',
      '- Piece-level continuity passed for every (part, batch, piece): next operation starts after prior operation ends.',
      '- Personnel_Daily_Full and Utilization_Summary reconcile exactly against Personnel_Event_Log for run/setup minutes and event counts.',
      '',
      '## Artifacts',
      `- Metrics JSON: ${summaryPath}`,
      `- Workbook folder: ${workbookRoot}`,
      '',
    ].join('\n')

    const reportPath = path.join(artifactRoot, 'summary.md')
    fs.writeFileSync(reportPath, markdown, 'utf8')

    expect(fs.existsSync(summaryPath)).toBe(true)
    expect(fs.existsSync(reportPath)).toBe(true)
  })
})
