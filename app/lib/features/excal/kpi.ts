import type { ExcalKpi, ExcalRow, OperatorSummaryRow, WOBreakdownRow } from './types'

function isClassifiedCycle(row: ExcalRow): boolean {
  return row.action === 'SPINDLE_OFF' && (row.classification === 'GOOD' || row.classification === 'WARNING' || row.classification === 'BAD')
}

export function computeKpis(rows: ExcalRow[]): ExcalKpi {
  const cycleRows = rows.filter(isClassifiedCycle)

  if (!cycleRows.length) {
    return {
      totalCycles: 0,
      goodCycles: 0,
      warningCycles: 0,
      badCycles: 0,
      goodRatePct: 0,
      avgDurationSec: 0,
      avgIdealSec: 0,
      avgVarianceSec: 0,
    }
  }

  const goodCycles = cycleRows.filter((row) => row.classification === 'GOOD').length
  const warningCycles = cycleRows.filter((row) => row.classification === 'WARNING').length
  const badCycles = cycleRows.filter((row) => row.classification === 'BAD').length

  const totalDuration = cycleRows.reduce((sum, row) => sum + (row.durationSec ?? 0), 0)
  const totalIdeal = cycleRows.reduce((sum, row) => sum + (row.idealSec ?? 0), 0)
  const totalVariance = cycleRows.reduce((sum, row) => sum + (row.varianceSec ?? 0), 0)

  return {
    totalCycles: cycleRows.length,
    goodCycles,
    warningCycles,
    badCycles,
    goodRatePct: Number(((goodCycles / cycleRows.length) * 100).toFixed(2)),
    avgDurationSec: Number((totalDuration / cycleRows.length).toFixed(2)),
    avgIdealSec: Number((totalIdeal / cycleRows.length).toFixed(2)),
    avgVarianceSec: Number((totalVariance / cycleRows.length).toFixed(2)),
  }
}

export function computeWOBreakdown(rows: ExcalRow[]): WOBreakdownRow[] {
  const grouped = new Map<string, WOBreakdownRow>()

  for (const row of rows) {
    if (!isClassifiedCycle(row)) continue

    const key = row.woCode ?? `WO-${row.woId ?? 'NA'}`
    const existing = grouped.get(key)

    if (existing) {
      existing.cycles += 1
      existing.totalDurationSec += row.durationSec ?? 0
      existing.rejectQty += row.rejectQty ?? 0
      if (row.classification === 'GOOD') existing.good += 1
      if (row.classification === 'WARNING') existing.warning += 1
      if (row.classification === 'BAD') existing.bad += 1
      continue
    }

    grouped.set(key, {
      woId: row.woId,
      woCode: key,
      cycles: 1,
      good: row.classification === 'GOOD' ? 1 : 0,
      warning: row.classification === 'WARNING' ? 1 : 0,
      bad: row.classification === 'BAD' ? 1 : 0,
      totalDurationSec: row.durationSec ?? 0,
      rejectQty: row.rejectQty ?? 0,
    })
  }

  return Array.from(grouped.values()).sort((a, b) => a.woCode.localeCompare(b.woCode))
}

export function computeOperatorSummary(rows: ExcalRow[]): OperatorSummaryRow[] {
  const grouped = new Map<string, OperatorSummaryRow>()

  for (const row of rows) {
    if (!isClassifiedCycle(row)) continue

    const key = row.operator ?? 'Unknown'
    const existing = grouped.get(key)

    if (existing) {
      existing.cycles += 1
      existing.rejectQty += row.rejectQty ?? 0
      if (row.classification === 'GOOD') existing.good += 1
      if (row.classification === 'WARNING') existing.warning += 1
      if (row.classification === 'BAD') existing.bad += 1
      continue
    }

    grouped.set(key, {
      operator: key,
      cycles: 1,
      good: row.classification === 'GOOD' ? 1 : 0,
      warning: row.classification === 'WARNING' ? 1 : 0,
      bad: row.classification === 'BAD' ? 1 : 0,
      rejectQty: row.rejectQty ?? 0,
    })
  }

  return Array.from(grouped.values()).sort((a, b) => a.operator.localeCompare(b.operator))
}
