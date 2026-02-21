import { fetchAllDeviceLogs, fetchWorkOrders } from './api'
import { classifyRowsV2 } from './classification'
import { computeKpis, computeOperatorSummary, computeWOBreakdown } from './kpi'
import { segmentAndSplit } from './jobs'
import { normalizeLogs } from './normalize'
import { buildRows } from './rows'
import type { ExcalPipelineOutput, PipelineRequest } from './types'
import { assignSerialNumbers, sortRowsDescending } from './utils'

export async function runExcalPipeline(request: PipelineRequest): Promise<ExcalPipelineOutput> {
  const fetched = await fetchAllDeviceLogs(request)
  const normalized = normalizeLogs(fetched.logs)

  const woIds = Array.from(
    new Set(
      normalized
        .map((log) => log.woId)
        .filter((woId): woId is number => typeof woId === 'number' && Number.isFinite(woId) && woId > 0)
    )
  )

  const woMap = await fetchWorkOrders(woIds)

  const split = segmentAndSplit(normalized, woMap)

  const rowsAscending = buildRows(
    split.segments.map((segment) => ({
      segment,
      cycles: split.cyclesBySegment.get(segment.segmentId) ?? [],
      pauses: split.pausesBySegment.get(segment.segmentId) ?? [],
      jobs: split.jobsBySegment.get(segment.segmentId) ?? [],
    }))
  )

  const classifiedAscending = classifyRowsV2(rowsAscending)

  const kpis = computeKpis(classifiedAscending)
  const woBreakdown = computeWOBreakdown(classifiedAscending)
  const operatorSummary = computeOperatorSummary(classifiedAscending)

  const finalRows = assignSerialNumbers(sortRowsDescending(classifiedAscending))

  return {
    rows: finalRows,
    kpis,
    woBreakdown,
    operatorSummary,
    meta: {
      fetchedPages: fetched.fetchedPages,
      fetchedLogs: fetched.logs.length,
      normalizedLogs: normalized.length,
      segments: split.segments.length,
      cycles: Array.from(split.cyclesBySegment.values()).reduce((sum, items) => sum + items.length, 0),
      jobs: Array.from(split.jobsBySegment.values()).reduce((sum, items) => sum + items.length, 0),
    },
  }
}
