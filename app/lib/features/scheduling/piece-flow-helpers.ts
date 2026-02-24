export interface PieceFlowRowLike {
  id: string
  part: string
  batch: string
  piece: number
  operationSeq: number
  machine: string
  start: Date
  end: Date
  status: string
}

export interface PieceTimelinePayloadRowLike {
  partNumber?: string
  part?: string
  batchId?: string
  batch?: string
  piece?: string | number
  operationSeq?: string | number
  operation?: string | number
  machine?: string
  runStart?: string | Date
  start?: string | Date
  runEnd?: string | Date
  end?: string | Date
  status?: string
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const parsed = new Date(String(value))
  if (!Number.isNaN(parsed.getTime())) return parsed
  if (typeof value === 'string') {
    const normalized = value.replace(',', '')
    const retry = new Date(normalized)
    if (!Number.isNaN(retry.getTime())) return retry
  }
  return null
}

export const normalizeMachineLane = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return 'VMC 1'
  const compact = raw.toUpperCase().replace(/\s+/g, '')
  const match = compact.match(/^VMC0*(\d{1,2})$/)
  if (match) {
    return `VMC ${Number(match[1])}`
  }
  return raw
}

export const buildPieceFlowRows = (
  scheduleRows: any[],
  pieceTimelineRows: PieceTimelinePayloadRowLike[] = []
): { rows: PieceFlowRowLike[]; isApproximate: boolean } => {
  if (pieceTimelineRows.length > 0) {
    const rows = pieceTimelineRows
      .map((row: PieceTimelinePayloadRowLike, rowIndex: number) => {
        const part = String(row.partNumber || row.part || 'UNKNOWN')
        const batch = String(row.batchId || row.batch || `B-${rowIndex + 1}`)
        const piece = Number(row.piece || 0)
        const operationSeq = Number(row.operationSeq || row.operation || 1)
        const machine = normalizeMachineLane(row.machine || 'VMC 1')
        const start = toDate(row.runStart || row.start)
        const end = toDate(row.runEnd || row.end)

        if (!start || !end || end <= start) return null
        if (!Number.isFinite(piece) || piece <= 0) return null
        if (!Number.isFinite(operationSeq) || operationSeq <= 0) return null

        return {
          id: `${part}-${batch}-op${operationSeq}-p${piece}`,
          part,
          batch,
          piece,
          operationSeq,
          machine,
          start,
          end,
          status: String(row.status || 'OK'),
        } satisfies PieceFlowRowLike
      })
      .filter((row): row is PieceFlowRowLike => Boolean(row))

    return { rows, isApproximate: false }
  }

  const rows: PieceFlowRowLike[] = []

  scheduleRows.forEach((row: any, rowIndex: number) => {
    const part = String(row.partNumber || row.partnumber || row.part_number || 'UNKNOWN')
    const batch = String(row.batchId || row.batch_id || `B-${rowIndex + 1}`)
    const operationSeq = Number(row.operationSeq || row.operation_seq || 1)
    const machine = normalizeMachineLane(row.machine || 'VMC 1')
    const runStart = toDate(row.runStart || row.run_start)
    const runEnd = toDate(row.runEnd || row.run_end)
    const qtyRaw = Number(row.batchQty || row.batch_qty || row.orderQty || row.order_quantity || 1)
    const qty = Math.max(1, Number.isFinite(qtyRaw) ? Math.round(qtyRaw) : 1)

    if (!runStart || !runEnd || runEnd <= runStart) return

    const totalMs = runEnd.getTime() - runStart.getTime()
    const eachMs = Math.max(60_000, Math.floor(totalMs / qty))

    for (let piece = 1; piece <= qty; piece++) {
      const pieceStart = new Date(runStart.getTime() + eachMs * (piece - 1))
      const tentativeEnd = new Date(runStart.getTime() + eachMs * piece)
      const pieceEnd = piece === qty ? runEnd : tentativeEnd

      rows.push({
        id: `${part}-${batch}-op${operationSeq}-p${piece}`,
        part,
        batch,
        piece,
        operationSeq,
        machine,
        start: pieceStart,
        end: pieceEnd,
        status: String(row.status || 'OK'),
      })
    }
  })

  return { rows, isApproximate: true }
}

export const filterPieceFlowRows = (
  rows: PieceFlowRowLike[],
  filters: {
    part?: string
    pieceFrom?: number
    pieceTo?: number
    operationSeq?: number | null
    machine?: string | null
    batch?: string | null
  }
): PieceFlowRowLike[] => {
  const partFilter = filters.part || 'ALL'
  const pieceFrom = Number.isFinite(filters.pieceFrom) ? Number(filters.pieceFrom) : 1
  const pieceTo = Number.isFinite(filters.pieceTo)
    ? Number(filters.pieceTo)
    : Number.MAX_SAFE_INTEGER
  const operationFilter = Number.isFinite(filters.operationSeq)
    ? Number(filters.operationSeq)
    : null
  const machineFilter = String(filters.machine || '').trim()
  const batchFilter = String(filters.batch || '').trim()

  return rows.filter(row => {
    const partMatch = partFilter === 'ALL' || row.part === partFilter
    const pieceMatch = row.piece >= pieceFrom && row.piece <= pieceTo
    const opMatch = operationFilter === null || row.operationSeq === operationFilter
    const machineMatch =
      !machineFilter || normalizeMachineLane(row.machine) === normalizeMachineLane(machineFilter)
    const batchMatch = !batchFilter || row.batch === batchFilter
    return partMatch && pieceMatch && opMatch && machineMatch && batchMatch
  })
}

export const formatSchedulingFailureAlert = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown scheduling error'
  return `Scheduling failed: ${message}`
}

export const formatImportFailureAlert = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown import error'
  return `Failed to import Excel file: ${message}`
}

export const safelyEvaluate = <T>(
  evaluate: () => T,
  fallbackValue: T
): { value: T; error: string | null } => {
  try {
    return { value: evaluate(), error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown evaluation error'
    return { value: fallbackValue, error: `Verification failed: ${message}` }
  }
}
