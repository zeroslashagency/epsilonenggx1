export interface PieceTimelinePayloadRow {
  id?: string
  part?: string
  partNumber?: string
  batch?: string
  batchId?: string
  piece?: number
  operation?: string | number
  operationSeq?: number
  machine?: string
  person?: string
  operator?: string
  handleMode?: string
  start?: string
  runStart?: string
  end?: string
  runEnd?: string
  status?: string
}

export type VerificationIssueSeverity = 'critical' | 'warning' | 'info'

export interface VerificationIssue {
  id: string
  code: string
  severity: VerificationIssueSeverity
  message: string
  entityId?: string
  startTs?: number
  endTs?: number
}

export interface VerificationReport {
  isValid: boolean
  issues: VerificationIssue[]
}

interface NormalizedPieceEvent {
  id: string
  part: string
  batch: string
  piece: number
  operationSeq: number
  machine: string
  person: string
  handleMode: 'single' | 'double'
  startTs: number
  endTs: number
}

const toTimestamp = (value: string | undefined): number => {
  if (!value) return NaN
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : NaN
}

const parseHandleMode = (value: string | undefined): 'single' | 'double' => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized.includes('double') ? 'double' : 'single'
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd

const runUnits = (mode: 'single' | 'double'): number => (mode === 'double' ? 1 : 2)

function normalizeTimeline(timeline: PieceTimelinePayloadRow[]): NormalizedPieceEvent[] {
  return timeline
    .map((event, index) => {
      const startTs = toTimestamp(event.runStart || event.start)
      const endTs = toTimestamp(event.runEnd || event.end)
      if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return null

      const part = String(event.part || event.partNumber || 'UNKNOWN').trim()
      const batch = String(event.batch || event.batchId || 'B00').trim()
      const piece = Number(event.piece || 1)
      const operationSeq = Number(event.operationSeq || event.operation || 1)
      const machine = String(event.machine || 'UNKNOWN').trim()
      const person = String(event.person || event.operator || 'Unassigned').trim()
      const handleMode = parseHandleMode(event.handleMode)

      return {
        id: String(event.id || `${part}-${batch}-${piece}-${operationSeq}-${index}`),
        part,
        batch,
        piece: Number.isFinite(piece) && piece > 0 ? piece : 1,
        operationSeq: Number.isFinite(operationSeq) && operationSeq > 0 ? operationSeq : 1,
        machine,
        person,
        handleMode,
        startTs,
        endTs,
      } satisfies NormalizedPieceEvent
    })
    .filter((row): row is NormalizedPieceEvent => Boolean(row))
    .sort((a, b) => a.startTs - b.startTs || a.endTs - b.endTs)
}

export function buildEventPipeline(timeline: PieceTimelinePayloadRow[]) {
  return normalizeTimeline(timeline)
}

export function verifyPieceFlow(timeline: PieceTimelinePayloadRow[]): VerificationReport {
  const issues: VerificationIssue[] = []
  let isValid = true
  const dedupe = new Set<string>()

  const addIssue = (issue: VerificationIssue) => {
    const key = `${issue.code}|${issue.entityId || ''}|${issue.startTs || ''}|${issue.endTs || ''}|${issue.message}`
    if (dedupe.has(key)) return
    dedupe.add(key)
    issues.push(issue)
    if (issue.severity === 'critical') isValid = false
  }

  const events = buildEventPipeline(timeline)

  const byMachine = new Map<string, NormalizedPieceEvent[]>()
  events.forEach(event => {
    const bucket = byMachine.get(event.machine) || []
    bucket.push(event)
    byMachine.set(event.machine, bucket)
  })

  byMachine.forEach((machineEvents, machine) => {
    const sorted = [...machineEvents].sort((a, b) => a.startTs - b.startTs)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (!overlaps(prev.startTs, prev.endTs, curr.startTs, curr.endTs)) continue
      addIssue({
        id: `MACH_OVERLAP_${prev.id}_${curr.id}`,
        code: 'MACHINE_OVERLAP',
        severity: 'critical',
        message: `Overlap on ${machine}: ${prev.part}/${prev.batch}/P${prev.piece}/OP${prev.operationSeq} with ${curr.part}/${curr.batch}/P${curr.piece}/OP${curr.operationSeq}.`,
        entityId: machine,
        startTs: curr.startTs,
        endTs: prev.endTs,
      })
    }
  })

  const byPiece = new Map<string, NormalizedPieceEvent[]>()
  events.forEach(event => {
    const key = `${event.part}|${event.batch}|${event.piece}`
    const bucket = byPiece.get(key) || []
    bucket.push(event)
    byPiece.set(key, bucket)
  })

  byPiece.forEach((pieceEvents, key) => {
    const sorted = [...pieceEvents].sort((a, b) => a.operationSeq - b.operationSeq || a.startTs - b.startTs)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr.operationSeq <= prev.operationSeq && curr.startTs < prev.endTs) {
        addIssue({
          id: `PRECEDENCE_${prev.id}_${curr.id}`,
          code: 'PRECEDENCE_VIOLATION',
          severity: 'critical',
          message: `Precedence violation for ${key}: OP${curr.operationSeq} starts before prior operation completion.`,
          entityId: key,
          startTs: curr.startTs,
          endTs: prev.endTs,
        })
      }
    }
  })

  const byPerson = new Map<string, NormalizedPieceEvent[]>()
  events.forEach(event => {
    const bucket = byPerson.get(event.person) || []
    bucket.push(event)
    byPerson.set(event.person, bucket)
  })

  byPerson.forEach((personEvents, person) => {
    if (personEvents.length < 2) return
    const points = Array.from(new Set(personEvents.flatMap(event => [event.startTs, event.endTs]))).sort(
      (a, b) => a - b
    )

    for (let i = 0; i < points.length - 1; i++) {
      const startTs = points[i]
      const endTs = points[i + 1]
      if (endTs <= startTs) continue

      const active = personEvents.filter(event => overlaps(event.startTs, event.endTs, startTs, endTs))
      if (active.length <= 1) continue

      const hasSingle = active.some(event => event.handleMode === 'single')
      const units = active.reduce((sum, event) => sum + runUnits(event.handleMode), 0)

      if (hasSingle) {
        addIssue({
          id: `PERSON_SINGLE_${person}_${startTs}`,
          code: 'PERSON_SINGLE_MODE_OVERLAP',
          severity: 'critical',
          message: `${person} has SINGLE MACHINE run overlapping another run.`,
          entityId: person,
          startTs,
          endTs,
        })
      }

      if (units > 2) {
        addIssue({
          id: `PERSON_CAPACITY_${person}_${startTs}`,
          code: 'PERSON_RUN_CAPACITY_EXCEEDED',
          severity: 'critical',
          message: `${person} run capacity exceeded (used ${units}, max 2).`,
          entityId: person,
          startTs,
          endTs,
        })
      }
    }
  })

  return {
    isValid,
    issues,
  }
}
