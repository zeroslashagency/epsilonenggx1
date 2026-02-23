import type { MasterDataEntry } from './master-data-loader'

interface Interval {
  start: Date
  end: Date
}

type HandleMode = 'single' | 'double'

interface TimeWindow {
  startMinute: number
  endMinute: number
  overnight: boolean
  raw: string
}

interface PersonnelSpec {
  uid: string
  name: string
  sourceSection: 'production' | 'setup'
  levelUp: number
  setupEligible: boolean
  productionEligible: boolean
  setupPriority: number
  shift: TimeWindow
}

interface OperationSpec {
  operationSeq: number
  operationName: string
  setupTimeMin: number
  cycleTimeMin: number
  minimumBatchSize: number
  eligibleMachines: string[]
  handleMode: HandleMode
  fixedMachine?: string
}

interface PersonReservation extends Interval {
  type: 'setup' | 'run'
  units: number
  ref: string
  handleMode: HandleMode
}

interface PieceRun {
  start: Date
  end: Date
}

interface ParsedSettings {
  globalStart: Date
  setupWindow: TimeWindow
  productionWindows: TimeWindow[]
  personnel: PersonnelSpec[]
  setupPersonnel: PersonnelSpec[]
  productionPersonnel: PersonnelSpec[]
  holidayIntervals: Interval[]
  breakdownByMachine: Map<string, Interval[]>
}

const DEFAULT_MACHINES = ['VMC 1', 'VMC 2', 'VMC 3', 'VMC 4', 'VMC 5', 'VMC 6', 'VMC 7', 'VMC 8', 'VMC 9', 'VMC 10']
const DEFAULT_OPERATOR_WINDOW = '06:00-22:00'
const DEFAULT_PRODUCTION_WINDOW = '00:00-23:59'

const PRIORITY_SCORE: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
}

export class DeterministicSchedulingEngine {
  private readonly masterData: MasterDataEntry[]

  constructor(masterData: MasterDataEntry[]) {
    this.masterData = Array.isArray(masterData) ? masterData : []
  }

  runSchedule(orders: any[], settings: any): { rows: any[]; pieceTimeline: any[] } {
    const parsedSettings = this.parseSettings(settings)
    const machineNextFree = new Map<string, Date>()
    const personCalendars = new Map<string, PersonReservation[]>()
    parsedSettings.personnel.forEach(person => {
      personCalendars.set(person.name, [])
    })

    const scheduleRows: any[] = []
    const pieceTimeline: any[] = []
    const ordered = [...(orders || [])].sort((a, b) => this.compareOrders(a, b))
    const orderStartOverrides = this.buildOrderStartOverrides(orders, parsedSettings.globalStart)
    let globalBatchCounter = 1

    for (const order of ordered) {
      const partNumber = String(order?.partNumber || '').trim()
      if (!partNumber) continue

      const orderQty = Math.max(1, Number(order?.orderQuantity) || 1)
      const operationSeqs = this.parseOperationSeq(order?.operationSeq)
      const operationSpecs = this.resolveOperationSpecs(partNumber, operationSeqs, order)
      if (operationSpecs.length === 0) continue
      const orderStart = orderStartOverrides.get(String(order?.id || '')) || parsedSettings.globalStart

      const batchQuantities = this.splitBatchQuantities(
        orderQty,
        String(order?.batchMode || 'auto-split'),
        Number(order?.customBatchSize) || 0,
        operationSpecs,
        orderStart,
        machineNextFree
      )

      const dueDate = this.tryParseDate(order?.dueDate)

      const batchIds = batchQuantities.map(() => `B${String(globalBatchCounter++).padStart(2, '0')}`)
      let upstreamPieceCompletionsByBatch = new Map<string, Date[]>()
      const previousMachineByBatch = new Map<string, string | null>()

      batchQuantities.forEach((batchQty, batchIndex) => {
        const batchId = batchIds[batchIndex]
        upstreamPieceCompletionsByBatch.set(
          batchId,
          Array.from({ length: Math.max(1, batchQty) }, () => new Date(orderStart))
        )
        previousMachineByBatch.set(batchId, null)
      })

      for (const operation of operationSpecs) {
        const nextPieceCompletionsByBatch = new Map<string, Date[]>()

        batchQuantities.forEach((batchQty, batchIndex) => {
          const batchId = batchIds[batchIndex]
          const arrivals =
            upstreamPieceCompletionsByBatch.get(batchId) ||
            Array.from({ length: Math.max(1, batchQty) }, () => new Date(orderStart))
          const predecessorReady = arrivals[0] || orderStart
          const prevMachine = previousMachineByBatch.get(batchId) || null

          const candidate = this.pickBestMachineAndOperator({
            operation,
            orderStart,
            predecessorReady,
            arrivals,
            prevMachine,
            parsedSettings,
            machineNextFree,
            personCalendars
          })

          machineNextFree.set(candidate.machine, new Date(candidate.runEnd))
          this.reservePersonSetup(
            personCalendars,
            candidate.setupPerson,
            candidate.setupStart,
            candidate.setupEnd,
            `${partNumber}/${batchId}/OP${operation.operationSeq}`
          )
          this.reservePersonRun(
            personCalendars,
            candidate.productionPerson,
            candidate.runStart,
            candidate.runEnd,
            operation.handleMode,
            `${partNumber}/${batchId}/OP${operation.operationSeq}`
          )

          scheduleRows.push({
            id: `${String(order?.id || `${partNumber}-${batchId}`)}-${batchId}-op-${operation.operationSeq}`,
            partNumber,
            orderQty,
            priority: this.toPriorityLabel(order?.priority),
            batchId,
            batchQty,
            operationSeq: operation.operationSeq,
            operationName: operation.operationName,
            machine: candidate.machine,
            person: candidate.productionPerson,
            setupPersonName: candidate.setupPerson,
            productionPersonName: candidate.productionPerson,
            handleMode: operation.handleMode,
            setupStart: this.toLocalIso(candidate.setupStart),
            setupEnd: this.toLocalIso(candidate.setupEnd),
            runStart: this.toLocalIso(candidate.runStart),
            runEnd: this.toLocalIso(candidate.runEnd),
            timing: this.formatTiming(candidate.setupStart, candidate.runEnd, candidate.runPausedMin),
            dueDate: dueDate ? this.toLocalIso(dueDate) : 'N/A',
            status: 'Scheduled'
          })

          candidate.pieceRuns.forEach((pieceRun, pieceIndex) => {
            pieceTimeline.push({
              partNumber,
              batchId,
              piece: pieceIndex + 1,
              operationSeq: operation.operationSeq,
              operationName: operation.operationName,
              machine: candidate.machine,
              person: candidate.productionPerson,
              handleMode: operation.handleMode,
              runStart: this.toLocalIso(pieceRun.start),
              runEnd: this.toLocalIso(pieceRun.end),
              status: 'Scheduled'
            })
          })

          nextPieceCompletionsByBatch.set(batchId, candidate.pieceCompletions)
          previousMachineByBatch.set(batchId, candidate.machine)
        })

        upstreamPieceCompletionsByBatch = nextPieceCompletionsByBatch
      }
    }

    return {
      rows: scheduleRows,
      pieceTimeline
    }
  }

  private compareOrders(a: any, b: any): number {
    const pa = PRIORITY_SCORE[String(a?.priority || '').toLowerCase()] ?? PRIORITY_SCORE.normal
    const pb = PRIORITY_SCORE[String(b?.priority || '').toLowerCase()] ?? PRIORITY_SCORE.normal
    if (pa !== pb) return pa - pb

    const da = this.tryParseDate(a?.dueDate)
    const db = this.tryParseDate(b?.dueDate)
    if (da && db && da.getTime() !== db.getTime()) return da.getTime() - db.getTime()
    if (da && !db) return -1
    if (!da && db) return 1
    return String(a?.id || '').localeCompare(String(b?.id || ''))
  }

  private buildOrderStartOverrides(orders: any[], globalStart: Date): Map<string, Date> {
    const map = new Map<string, Date>()
    ;(orders || []).forEach((order: any) => {
      const id = String(order?.id || '')
      if (!id) return
      const startCandidate = this.tryParseDate(order?.startDateTime || order?.startDate)
      map.set(id, startCandidate || globalStart)
    })
    return map
  }

  private parseOperationSeq(raw: unknown): number[] {
    const text = String(raw || '')
    const values = text
      .split(',')
      .map(token => Number(token.replace(/[^\d]/g, '').trim()))
      .filter(value => Number.isFinite(value) && value > 0)

    return values.length > 0 ? Array.from(new Set(values)) : [1]
  }

  private resolveOperationSpecs(partNumber: string, requestedSeqs: number[], order?: any): OperationSpec[] {
    const orderOps = this.resolveOrderOperationDetails(order)
    const orderOpMap = new Map(orderOps.map(op => [op.operationSeq, op]))

    const partRows = this.masterData
      .filter(row => String(row.PartNumber) === partNumber)
      .sort((a, b) => Number(a.OperationSeq) - Number(b.OperationSeq))

    const selected = requestedSeqs
      .map(seq => {
        const orderSpec = orderOpMap.get(seq)
        if (orderSpec) {
          return orderSpec
        }

        const source = partRows.find(row => Number(row.OperationSeq) === seq)
        if (!source) {
          return {
            operationSeq: seq,
            operationName: `Operation ${seq}`,
            setupTimeMin: 60,
            cycleTimeMin: 5,
            minimumBatchSize: 200,
            eligibleMachines: ['VMC 1', 'VMC 2', 'VMC 3', 'VMC 4'],
            handleMode: 'single',
          } satisfies OperationSpec
        }

        const machines = this.parseMachines(source.EligibleMachines)
        return {
          operationSeq: Number(source.OperationSeq),
          operationName: String(source.OperationName || `Operation ${source.OperationSeq}`),
          setupTimeMin: Math.max(1, Number(source.SetupTime_Min) || 60),
          cycleTimeMin: Math.max(1, Number(source.CycleTime_Min) || 1),
          minimumBatchSize: Math.max(1, Number(source.Minimum_BatchSize) || 200),
          eligibleMachines: machines.length > 0 ? machines : ['VMC 1', 'VMC 2', 'VMC 3', 'VMC 4'],
          handleMode: this.parseHandleMode((source as any).HandleMachines || (source as any).handle_machines)
        } satisfies OperationSpec
      })
      .sort((a, b) => a.operationSeq - b.operationSeq)

    return selected
  }

  private resolveOrderOperationDetails(order: any): OperationSpec[] {
    if (!Array.isArray(order?.operationDetails)) return []

    return order.operationDetails
      .map((item: any) => {
        const seq = Number(item?.operationSeq || item?.OperationSeq)
        if (!Number.isFinite(seq) || seq <= 0) return null

        const operationName = String(
          item?.operationName || item?.OperationName || `Operation ${seq}`
        ).trim()
        const setupTimeMin = Math.max(1, Number(item?.setupTimeMin || item?.SetupTime_Min) || 60)
        const cycleTimeMin = Math.max(1, Number(item?.cycleTimeMin || item?.CycleTime_Min) || 1)
        const minimumBatchSize = Math.max(
          1,
          Number(item?.minimumBatchSize || item?.Minimum_BatchSize) || 200
        )
        const fixedMachine = String(item?.fixedMachine || item?.machine || item?.Machine || '')
          .trim()
        const parsedEligible = Array.isArray(item?.eligibleMachines)
          ? item.eligibleMachines.map((value: any) => String(value).trim()).filter(Boolean)
          : this.parseMachines(item?.eligibleMachines || item?.EligibleMachines || '')
        const eligibleMachines =
          fixedMachine.length > 0
            ? [fixedMachine]
            : parsedEligible.length > 0
              ? parsedEligible
              : [...DEFAULT_MACHINES]

        return {
          operationSeq: seq,
          operationName: operationName || `Operation ${seq}`,
          setupTimeMin,
          cycleTimeMin,
          minimumBatchSize,
          eligibleMachines,
          handleMode: this.parseHandleMode(
            item?.handleMode || item?.HandleMode || item?.HandleMachines || item?.handle_machines
          ),
          fixedMachine: fixedMachine || undefined
        } satisfies OperationSpec
      })
      .filter((value: OperationSpec | null): value is OperationSpec => Boolean(value))
      .sort((a: OperationSpec, b: OperationSpec) => a.operationSeq - b.operationSeq)
  }

  private splitBatchQuantities(
    orderQty: number,
    batchMode: string,
    customBatchSize: number,
    operations: OperationSpec[],
    orderStart: Date,
    machineNextFree: Map<string, Date>
  ): number[] {
    const normalizedMode = batchMode.toLowerCase()
    const minBatch = operations.reduce((min, op) => Math.min(min, op.minimumBatchSize), Number.MAX_SAFE_INTEGER)
    const defaultMinBatch = Math.max(1, Number.isFinite(minBatch) ? minBatch : 200)

    if (normalizedMode === 'single-batch') {
      return [orderQty]
    }

    if (normalizedMode === 'custom-batch-size' && customBatchSize > 0) {
      const quantities: number[] = []
      let remaining = orderQty
      while (remaining > 0) {
        const batchQty = Math.min(customBatchSize, remaining)
        quantities.push(batchQty)
        remaining -= batchQty
      }
      return quantities.length > 0 ? quantities : [orderQty]
    }

    const lanes = this.pickAutoSplitLanes(
      orderQty,
      defaultMinBatch,
      operations,
      orderStart,
      machineNextFree
    )

    if (lanes <= 1) return [orderQty]

    const baseQty = Math.floor(orderQty / lanes)
    const quantities = Array.from({ length: lanes }, () => baseQty)
    let remainder = orderQty - baseQty * lanes

    for (let index = lanes - 1; index >= 0 && remainder > 0; index--) {
      quantities[index] += 1
      remainder -= 1
    }

    return quantities
  }

  private pickAutoSplitLanes(
    orderQty: number,
    minBatch: number,
    operations: OperationSpec[],
    orderStart: Date,
    machineNextFree: Map<string, Date>
  ): number {
    const firstOp = operations[0]
    if (!firstOp) return 1

    const machineCandidates = this.uniqueMachines(
      firstOp.fixedMachine ? [firstOp.fixedMachine] : firstOp.eligibleMachines
    )
    if (machineCandidates.length <= 1) return 1

    const legacyLaneCap = 2
    const maxLanes = Math.min(legacyLaneCap, machineCandidates.length)
    if (maxLanes <= 1) return 1
    if (orderQty < maxLanes * Math.max(1, minBatch)) return 1

    const earliestReadyMachines = machineCandidates
      .map(machine => ({
        machine,
        readyAt: machineNextFree.get(machine) || orderStart
      }))
      .sort((a, b) => a.readyAt.getTime() - b.readyAt.getTime())

    const readyWithinTwoHours = earliestReadyMachines.filter(candidate => {
      return candidate.readyAt.getTime() <= this.addMinutes(orderStart, 120).getTime()
    }).length

    if (readyWithinTwoHours >= 2) return 2
    return maxLanes
  }

  private pickBestMachineAndOperator(params: {
    operation: OperationSpec
    orderStart: Date
    predecessorReady: Date
    arrivals: Date[]
    prevMachine: string | null
    parsedSettings: ParsedSettings
    machineNextFree: Map<string, Date>
    personCalendars: Map<string, PersonReservation[]>
  }): {
    machine: string
    setupPerson: string
    productionPerson: string
    setupStart: Date
    setupEnd: Date
    runStart: Date
    runEnd: Date
    pieceRuns: PieceRun[]
    pieceCompletions: Date[]
    runPausedMin: number
  } {
    const {
      operation,
      orderStart,
      predecessorReady,
      arrivals,
      prevMachine,
      parsedSettings,
      machineNextFree,
      personCalendars
    } = params
    const setupCandidates =
      parsedSettings.setupPersonnel.length > 0
        ? parsedSettings.setupPersonnel
        : parsedSettings.personnel

    const productionPrimary =
      parsedSettings.productionPersonnel.length > 0
        ? parsedSettings.productionPersonnel
        : parsedSettings.personnel

    const runCandidateMap = new Map<string, PersonnelSpec>()
    productionPrimary.forEach(candidate => {
      runCandidateMap.set(candidate.name, candidate)
    })
    parsedSettings.setupPersonnel.forEach(candidate => {
      if (!runCandidateMap.has(candidate.name)) {
        runCandidateMap.set(candidate.name, candidate)
      }
    })
    const runCandidates = Array.from(runCandidateMap.values())

    let best: {
      machine: string
      setupPerson: string
      productionPerson: string
      setupPriority: number
      productionPriority: number
      setupStart: Date
      setupEnd: Date
      runStart: Date
      runEnd: Date
      pieceRuns: PieceRun[]
      pieceCompletions: Date[]
      runPausedMin: number
    } | null = null

    const baseMachines = operation.fixedMachine ? [operation.fixedMachine] : operation.eligibleMachines
    const machines = this.uniqueMachines(baseMachines)
    const machineRank = new Map(machines.map((machine, index) => [machine, index]))
    for (const machine of machines) {
      const machineReady = machineNextFree.get(machine) || parsedSettings.globalStart
      const baseCandidate = this.maxDate(orderStart, predecessorReady, machineReady)

      for (const setupPerson of setupCandidates) {
        if (!this.windowsOverlap(parsedSettings.setupWindow, setupPerson.shift)) {
          continue
        }

        const setupCandidate = this.maxDate(
          baseCandidate,
          this.nextPersonAvailability(personCalendars, setupPerson.name, baseCandidate)
        )
        const setupSlot = this.findContiguousSetupSlot(
          setupCandidate,
          operation.setupTimeMin,
          machine,
          setupPerson,
          parsedSettings,
          personCalendars
        )

        for (const productionPerson of runCandidates) {
          const runResult = this.findFeasibleRunReservation({
            setupEnd: setupSlot.end,
            arrivals,
            cycleTimeMin: operation.cycleTimeMin,
            machine,
            settings: parsedSettings,
            personCalendars,
            productionPerson: productionPerson.name,
            handleMode: operation.handleMode,
          })
          if (!runResult) continue

          const current = {
            machine,
            setupPerson: setupPerson.name,
            productionPerson: productionPerson.name,
            setupPriority: setupPerson.setupPriority,
            productionPriority: productionPerson.setupPriority,
            setupStart: setupSlot.start,
            setupEnd: setupSlot.end,
            runStart: runResult.runStart,
            runEnd: runResult.runEnd,
            pieceRuns: runResult.pieceRuns,
            pieceCompletions: runResult.pieceCompletions,
            runPausedMin: runResult.pausedMinutes
          }

          if (!best) {
            best = current
            continue
          }

          if (current.runEnd.getTime() < best.runEnd.getTime()) {
            best = current
            continue
          }
          if (current.runEnd.getTime() === best.runEnd.getTime()) {
            if (prevMachine && best.machine === prevMachine && current.machine !== prevMachine) {
              best = current
              continue
            }

            if (current.setupPriority < best.setupPriority) {
              best = current
              continue
            }

            if (
              current.setupPriority === best.setupPriority &&
              current.productionPriority < best.productionPriority
            ) {
              best = current
              continue
            }

            if (current.setupStart.getTime() < best.setupStart.getTime()) {
              best = current
              continue
            }
            if (
              current.setupStart.getTime() === best.setupStart.getTime() &&
              (machineRank.get(current.machine) ?? Number.MAX_SAFE_INTEGER) <
                (machineRank.get(best.machine) ?? Number.MAX_SAFE_INTEGER)
            ) {
              best = current
              continue
            }
          }
        }
      }
    }

    if (!best) {
      throw new Error(`Unable to place ${operation.operationName} for available machines`)
    }
    return best
  }

  private findContiguousSetupSlot(
    candidate: Date,
    setupMinutes: number,
    machine: string,
    setupPerson: PersonnelSpec,
    settings: ParsedSettings,
    personCalendars: Map<string, PersonReservation[]>
  ): { start: Date; end: Date } {
    let cursor = new Date(candidate)
    const maxSearch = 60 * 24 * 45
    for (let index = 0; index < maxSearch; index++) {
      if (!this.isSetupMinuteAllowed(cursor, machine, setupPerson, settings, personCalendars)) {
        const nextCandidate = this.nextSetupCandidate(cursor, settings.setupWindow, setupPerson.shift)
        cursor =
          nextCandidate.getTime() > cursor.getTime() ? nextCandidate : this.addMinutes(cursor, 1)
        continue
      }

      if (
        this.canFitContiguousSetup(
          cursor,
          setupMinutes,
          machine,
          setupPerson,
          settings,
          personCalendars
        )
      ) {
        return { start: new Date(cursor), end: this.addMinutes(cursor, setupMinutes) }
      }

      cursor = this.addMinutes(cursor, 1)
    }

    throw new Error(`Unable to find setup slot for ${machine} / ${setupPerson.name}`)
  }

  private canFitContiguousSetup(
    start: Date,
    setupMinutes: number,
    machine: string,
    setupPerson: PersonnelSpec,
    settings: ParsedSettings,
    personCalendars: Map<string, PersonReservation[]>
  ): boolean {
    for (let minute = 0; minute < setupMinutes; minute++) {
      const current = this.addMinutes(start, minute)
      if (!this.isSetupMinuteAllowed(current, machine, setupPerson, settings, personCalendars)) {
        return false
      }
    }
    return true
  }

  private simulatePieceFlow(params: {
    setupEnd: Date
    runReadyAt: Date
    arrivals: Date[]
    cycleTimeMin: number
    machine: string
    settings: ParsedSettings
  }): { runStart: Date; runEnd: Date; pieceRuns: PieceRun[]; pieceCompletions: Date[]; pausedMinutes: number } {
    const { setupEnd, runReadyAt, arrivals, cycleTimeMin, machine, settings } = params
    const pieceArrivals = arrivals.length > 0 ? arrivals : [setupEnd]
    const pieceRuns: PieceRun[] = []
    const pieceCompletions: Date[] = []

    let cursor = this.maxDate(setupEnd, runReadyAt)
    let runStart: Date | null = null
    let pausedMinutes = 0

    for (const arrival of pieceArrivals) {
      if (arrival.getTime() > cursor.getTime()) {
        cursor = new Date(arrival)
      }

      if (!this.isRunMinuteAllowed(cursor, machine, settings)) {
        const allowedStart = this.advanceToNextAllowedRun(cursor, machine, settings)
        if (arrival.getTime() <= cursor.getTime()) {
          pausedMinutes += this.diffMinutes(cursor, allowedStart)
        }
        cursor = allowedStart
      }

      if (!runStart) {
        runStart = new Date(cursor)
      }

      const pieceStart = new Date(cursor)
      const work = this.addRunWorkMinutes(
        cursor,
        Math.max(1, Math.ceil(cycleTimeMin)),
        machine,
        settings
      )
      pausedMinutes += work.pausedMinutes
      const pieceEnd = new Date(work.end)
      cursor = pieceEnd
      pieceRuns.push({ start: pieceStart, end: pieceEnd })
      pieceCompletions.push(new Date(cursor))
    }

    return {
      runStart: runStart || new Date(setupEnd),
      runEnd: new Date(cursor),
      pieceRuns,
      pieceCompletions,
      pausedMinutes
    }
  }

  private findFeasibleRunReservation(params: {
    setupEnd: Date
    arrivals: Date[]
    cycleTimeMin: number
    machine: string
    settings: ParsedSettings
    personCalendars: Map<string, PersonReservation[]>
    productionPerson: string
    handleMode: HandleMode
  }): { runStart: Date; runEnd: Date; pieceRuns: PieceRun[]; pieceCompletions: Date[]; pausedMinutes: number } | null {
    const { setupEnd, arrivals, cycleTimeMin, machine, settings, personCalendars, productionPerson, handleMode } =
      params
    const requiredUnits = this.runCapacityUnits(handleMode)
    let runReadyAt = new Date(setupEnd)

    const maxAttempts = 120
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const simulated = this.simulatePieceFlow({
        setupEnd,
        runReadyAt,
        arrivals,
        cycleTimeMin,
        machine,
        settings,
      })

      const conflict = this.findRunReservationConflict(
        personCalendars,
        productionPerson,
        simulated.runStart,
        simulated.runEnd,
        requiredUnits
      )
      if (!conflict) return simulated
      runReadyAt = this.maxDate(this.addMinutes(runReadyAt, 1), conflict.nextAvailable)
    }

    return null
  }

  private runCapacityUnits(handleMode: HandleMode): number {
    return handleMode === 'double' ? 1 : 2
  }

  private reservePersonSetup(
    calendars: Map<string, PersonReservation[]>,
    person: string,
    start: Date,
    end: Date,
    ref: string
  ): void {
    const bucket = this.getPersonReservations(calendars, person)
    bucket.push({
      start: new Date(start),
      end: new Date(end),
      type: 'setup',
      units: 2,
      ref,
      handleMode: 'single',
    })
    bucket.sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  private reservePersonRun(
    calendars: Map<string, PersonReservation[]>,
    person: string,
    start: Date,
    end: Date,
    handleMode: HandleMode,
    ref: string
  ): void {
    const bucket = this.getPersonReservations(calendars, person)
    bucket.push({
      start: new Date(start),
      end: new Date(end),
      type: 'run',
      units: this.runCapacityUnits(handleMode),
      ref,
      handleMode,
    })
    bucket.sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  private findRunReservationConflict(
    calendars: Map<string, PersonReservation[]>,
    person: string,
    runStart: Date,
    runEnd: Date,
    requiredUnits: number
  ): { nextAvailable: Date } | null {
    const reservations = this.getPersonReservations(calendars, person).filter(
      res => res.start < runEnd && runStart < res.end
    )
    if (reservations.length === 0) return null

    const setupConflict = reservations
      .filter(res => res.type === 'setup')
      .sort((a, b) => a.end.getTime() - b.end.getTime())[0]
    if (setupConflict) {
      return { nextAvailable: new Date(setupConflict.end) }
    }

    const runReservations = reservations.filter(res => res.type === 'run')
    if (runReservations.length === 0) return null

    const points = new Set<number>([runStart.getTime(), runEnd.getTime()])
    runReservations.forEach(res => {
      points.add(Math.max(runStart.getTime(), res.start.getTime()))
      points.add(Math.min(runEnd.getTime(), res.end.getTime()))
    })
    const ordered = Array.from(points).sort((a, b) => a - b)

    for (let index = 0; index < ordered.length - 1; index++) {
      const from = ordered[index]
      const to = ordered[index + 1]
      if (to <= from) continue
      const probe = new Date(Math.floor((from + to) / 2))
      let usedUnits = 0
      const activeRun = runReservations.filter(res => {
        const active = res.start.getTime() <= probe.getTime() && probe.getTime() < res.end.getTime()
        if (active) usedUnits += res.units
        return active
      })
      if (usedUnits + requiredUnits > 2) {
        const earliestEnd = activeRun.reduce(
          (min, res) => (res.end.getTime() < min.getTime() ? res.end : min),
          activeRun[0].end
        )
        return { nextAvailable: new Date(earliestEnd) }
      }
    }

    return null
  }

  private personHasAnyReservationAt(
    calendars: Map<string, PersonReservation[]>,
    person: string,
    date: Date
  ): boolean {
    const reservations = this.getPersonReservations(calendars, person)
    return reservations.some(res => res.start <= date && date < res.end)
  }

  private nextPersonAvailability(
    calendars: Map<string, PersonReservation[]>,
    person: string,
    start: Date
  ): Date {
    const reservations = this.getPersonReservations(calendars, person)
    let cursor = new Date(start)
    const maxIterations = 2000
    for (let i = 0; i < maxIterations; i++) {
      const active = reservations.find(res => res.start <= cursor && cursor < res.end)
      if (!active) return cursor
      cursor = new Date(active.end)
    }
    return cursor
  }

  private getPersonReservations(
    calendars: Map<string, PersonReservation[]>,
    person: string
  ): PersonReservation[] {
    const key = String(person || '').trim() || 'Unassigned'
    const bucket = calendars.get(key)
    if (bucket) return bucket
    const created: PersonReservation[] = []
    calendars.set(key, created)
    return created
  }

  private addRunWorkMinutes(
    start: Date,
    workMinutes: number,
    machine: string,
    settings: ParsedSettings
  ): { end: Date; pausedMinutes: number } {
    let cursor = new Date(start)
    let remaining = Math.max(1, workMinutes)
    let paused = 0
    const maxIterations = workMinutes + 60 * 24 * 45

    for (let i = 0; i < maxIterations; i++) {
      if (this.isRunMinuteAllowed(cursor, machine, settings)) {
        remaining -= 1
      } else {
        paused += 1
      }

      cursor = this.addMinutes(cursor, 1)

      if (remaining <= 0) {
        return { end: cursor, pausedMinutes: paused }
      }
    }

    throw new Error(`Unable to complete piece processing on ${machine}`)
  }

  private advanceToNextAllowedRun(start: Date, machine: string, settings: ParsedSettings): Date {
    let cursor = new Date(start)
    const maxIterations = 60 * 24 * 45
    for (let i = 0; i < maxIterations; i++) {
      if (this.isRunMinuteAllowed(cursor, machine, settings)) {
        return cursor
      }
      cursor = this.addMinutes(cursor, 1)
    }
    throw new Error(`Unable to find next allowed production minute on ${machine}`)
  }

  private isSetupMinuteAllowed(
    date: Date,
    machine: string,
    setupPerson: PersonnelSpec,
    settings: ParsedSettings,
    personCalendars: Map<string, PersonReservation[]>
  ): boolean {
    if (!this.isInWindow(date, settings.setupWindow)) return false
    if (!this.isInWindow(date, setupPerson.shift)) return false
    if (this.isHoliday(date, settings.holidayIntervals)) return false
    if (this.isInBreakdown(date, machine, settings.breakdownByMachine)) return false
    if (this.personHasAnyReservationAt(personCalendars, setupPerson.name, date)) return false
    return true
  }

  private isRunMinuteAllowed(date: Date, machine: string, settings: ParsedSettings): boolean {
    if (this.isHoliday(date, settings.holidayIntervals)) return false
    if (this.isInBreakdown(date, machine, settings.breakdownByMachine)) return false
    return settings.productionWindows.some(window => this.isInWindow(date, window))
  }

  private nextSetupCandidate(date: Date, setupWindow: TimeWindow, shiftWindow: TimeWindow): Date {
    const setupEntry = this.nextWindowEntry(date, setupWindow)
    const shiftEntry = this.nextWindowEntry(date, shiftWindow)
    return this.maxDate(setupEntry, shiftEntry)
  }

  private nextWindowEntry(date: Date, window: TimeWindow): Date {
    if (this.isInWindow(date, window)) {
      return new Date(date)
    }
    return this.nextWindowStart(date, window)
  }

  private isHoliday(date: Date, holidays: Interval[]): boolean {
    return holidays.some(interval => interval.start <= date && date < interval.end)
  }

  private isInBreakdown(date: Date, machine: string, breakdownByMachine: Map<string, Interval[]>): boolean {
    const intervals = breakdownByMachine.get(machine)
    if (!intervals || intervals.length === 0) return false
    return intervals.some(interval => interval.start <= date && date < interval.end)
  }

  private parseSettings(settings: any): ParsedSettings {
    const setupWindow = this.parseWindow(String(settings?.globalSetupWindow || DEFAULT_OPERATOR_WINDOW))
    const globalStart = this.tryParseDate(settings?.globalStartDateTime) || this.nextWindowStart(new Date(), setupWindow)

    const productionCandidates = [
      settings?.productionWindowShift1,
      settings?.productionWindowShift2,
      settings?.productionWindowShift3
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)

    const productionWindows = (productionCandidates.length > 0 ? productionCandidates : [DEFAULT_PRODUCTION_WINDOW])
      .map(value => this.parseWindow(value))

    const enforceOperatorShifts = settings?.enforceOperatorShifts === true
    const shiftCandidates = [settings?.shift1, settings?.shift2, settings?.shift3]
      .map(value => String(value || '').trim())
      .filter(Boolean)
    const shiftWindows =
      enforceOperatorShifts && shiftCandidates.length > 0
        ? shiftCandidates.map(value => this.parseWindow(value))
        : [setupWindow]

    const personnel = this.parsePersonnel(settings, shiftWindows, setupWindow)
    const setupPersonnel = personnel.filter(person => person.setupEligible)
    const productionPersonnel = personnel.filter(person => person.productionEligible)

    const holidayIntervals = this.parseHolidayIntervals(settings?.holidays)
    const breakdownByMachine = this.parseBreakdowns(settings?.breakdowns)

    return {
      globalStart,
      setupWindow,
      productionWindows,
      personnel,
      setupPersonnel,
      productionPersonnel,
      holidayIntervals,
      breakdownByMachine
    }
  }

  private parsePersonnel(
    settings: any,
    shiftWindows: TimeWindow[],
    setupWindow: TimeWindow
  ): PersonnelSpec[] {
    const fromProfiles = Array.isArray(settings?.personnelProfiles) ? settings.personnelProfiles : []
    const uniqueByName = new Map<string, PersonnelSpec>()

    fromProfiles.forEach((entry: any, index: number) => {
      const name = String(entry?.name || '').trim()
      if (!name) return

      const uid = String(entry?.uid || '').trim() || `UID-${index + 1}`
      const sourceRaw = String(entry?.sourceSection || '').trim().toLowerCase()
      const sourceSection: 'production' | 'setup' = sourceRaw === 'setup' ? 'setup' : 'production'
      const levelUp = Number(entry?.levelUp)
      const normalizedLevelUp = Number.isFinite(levelUp) ? (levelUp === 1 ? 1 : 0) : 0
      const setupEligible =
        entry?.setupEligible === true || sourceSection === 'setup' || normalizedLevelUp === 1
      const productionEligible =
        entry?.productionEligible === true || sourceSection === 'production' || sourceSection === 'setup'
      const setupPriority =
        sourceSection === 'setup'
          ? 1
          : Number.isFinite(Number(entry?.setupPriority))
            ? Math.max(1, Number(entry?.setupPriority))
            : normalizedLevelUp === 1
              ? 2
              : 99
      const shift = shiftWindows[index % shiftWindows.length] || setupWindow

      const existing = uniqueByName.get(name)
      if (!existing) {
        uniqueByName.set(name, {
          uid,
          name,
          sourceSection,
          levelUp: normalizedLevelUp,
          setupEligible,
          productionEligible,
          setupPriority,
          shift,
        })
        return
      }

      existing.setupEligible = existing.setupEligible || setupEligible
      existing.productionEligible = existing.productionEligible || productionEligible
      existing.levelUp = Math.max(existing.levelUp, normalizedLevelUp)
      existing.setupPriority = Math.min(existing.setupPriority, setupPriority)
      if (sourceSection === 'setup') existing.sourceSection = 'setup'
      uniqueByName.set(name, existing)
    })

    if (uniqueByName.size > 0) {
      return Array.from(uniqueByName.values()).sort((a, b) => {
        if (a.setupPriority !== b.setupPriority) return a.setupPriority - b.setupPriority
        return a.name.localeCompare(b.name)
      })
    }

    const operatorNames =
      Array.isArray(settings?.operators) && settings.operators.length > 0
        ? settings.operators.map((value: any) => String(value).trim()).filter(Boolean)
        : ['A', 'B', 'C', 'D']

    return operatorNames.map((name: string, index: number) => ({
      uid: `LEGACY-${index + 1}`,
      name,
      sourceSection: 'production',
      levelUp: 1,
      setupEligible: true,
      productionEligible: true,
      setupPriority: 5,
      shift: shiftWindows[index % shiftWindows.length] || setupWindow,
    }))
  }

  private parseHolidayIntervals(raw: any): Interval[] {
    if (!Array.isArray(raw)) return []
    const intervals: Interval[] = []

    raw.forEach(item => {
      if (!item) return
      if (typeof item === 'string' || item instanceof Date) {
        const date = this.tryParseDate(item)
        if (!date) return
        intervals.push({ start: this.startOfDay(date), end: this.addDays(this.startOfDay(date), 1) })
        return
      }

      const start = this.tryParseDate(item.startDateTime || item.start || item.from || item.date)
      const end = this.tryParseDate(item.endDateTime || item.end || item.to)
      if (start && end && end > start) {
        intervals.push({ start, end })
        return
      }
      if (start) {
        intervals.push({ start: this.startOfDay(start), end: this.addDays(this.startOfDay(start), 1) })
      }
    })

    return intervals
  }

  private parseBreakdowns(raw: any): Map<string, Interval[]> {
    const breakdownByMachine = new Map<string, Interval[]>()
    if (!Array.isArray(raw)) return breakdownByMachine

    raw.forEach(item => {
      if (!item) return
      const start = this.tryParseDate(item.startDateTime || item.start || item.from)
      const end = this.tryParseDate(item.endDateTime || item.end || item.to)
      if (!start || !end || end <= start) return

      const machines: string[] = []
      if (Array.isArray(item.machines)) {
        item.machines.forEach((machine: any) => {
          const value = String(machine || '').trim()
          if (value) machines.push(value)
        })
      } else if (item.machine) {
        const value = String(item.machine).trim()
        if (value) machines.push(value)
      }

      machines.forEach(machine => {
        const entries = breakdownByMachine.get(machine) || []
        entries.push({ start, end })
        breakdownByMachine.set(machine, entries)
      })
    })

    return breakdownByMachine
  }

  private parseWindow(window: string): TimeWindow {
    const match = String(window || '').match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
    if (!match) {
      return this.parseWindow(DEFAULT_OPERATOR_WINDOW)
    }

    const startHour = Math.max(0, Math.min(23, Number(match[1])))
    const startMinute = Math.max(0, Math.min(59, Number(match[2])))
    const endHour = Math.max(0, Math.min(23, Number(match[3])))
    const endMinute = Math.max(0, Math.min(59, Number(match[4])))
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute

    return {
      startMinute: start,
      endMinute: end,
      overnight: end <= start,
      raw: window
    }
  }

  private isInWindow(date: Date, window: TimeWindow): boolean {
    const minute = date.getHours() * 60 + date.getMinutes()
    return this.isMinuteInWindow(minute, window)
  }

  private isMinuteInWindow(minuteOfDay: number, window: TimeWindow): boolean {
    if (!window.overnight) {
      return minuteOfDay >= window.startMinute && minuteOfDay < window.endMinute
    }
    return minuteOfDay >= window.startMinute || minuteOfDay < window.endMinute
  }

  private windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
    for (let minute = 0; minute < 24 * 60; minute++) {
      if (this.isMinuteInWindow(minute, a) && this.isMinuteInWindow(minute, b)) {
        return true
      }
    }
    return false
  }

  private nextWindowStart(date: Date, window: TimeWindow): Date {
    const minute = date.getHours() * 60 + date.getMinutes()
    const startToday = this.atMinute(date, window.startMinute)

    if (!window.overnight) {
      if (date.getTime() <= startToday.getTime()) return startToday
      return this.addDays(startToday, 1)
    }

    if (minute >= window.startMinute) {
      return this.addDays(startToday, 1)
    }
    if (minute < window.endMinute) {
      return startToday
    }
    return startToday
  }

  private parseMachines(raw: unknown): string[] {
    const text = String(raw || '')
    const parsed = text
      .split(',')
      .map(machine => machine.trim())
      .filter(Boolean)
    return parsed.length > 0 ? parsed : [...DEFAULT_MACHINES]
  }

  private parseHandleMode(raw: unknown): HandleMode {
    const text = String(raw || '')
      .trim()
      .toLowerCase()
    return text.includes('double') ? 'double' : 'single'
  }

  private uniqueMachines(machines: string[]): string[] {
    const ordered: string[] = []
    const seen = new Set<string>()
    machines.forEach(machine => {
      const normalized = String(machine || '').trim()
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      ordered.push(normalized)
    })
    return ordered
  }

  private toPriorityLabel(value: unknown): string {
    const text = String(value || 'Normal').trim()
    if (!text) return 'Normal'
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  private tryParseDate(value: unknown): Date | null {
    if (!value) return null
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value)
    }
    const parsed = new Date(String(value))
    if (!Number.isNaN(parsed.getTime())) return parsed

    const normalized = String(value).replace(',', '')
    const retry = new Date(normalized)
    if (!Number.isNaN(retry.getTime())) return retry
    return null
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000)
  }

  private diffMinutes(a: Date, b: Date): number {
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000))
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60_000)
  }

  private atMinute(date: Date, minuteOfDay: number): Date {
    const target = new Date(date)
    target.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0)
    return target
  }

  private maxDate(...values: Date[]): Date {
    return new Date(Math.max(...values.map(value => value.getTime())))
  }

  private startOfDay(date: Date): Date {
    const value = new Date(date)
    value.setHours(0, 0, 0, 0)
    return value
  }

  private formatTiming(setupStart: Date, runEnd: Date, pausedMin: number): string {
    const elapsed = Math.max(0, Math.round((runEnd.getTime() - setupStart.getTime()) / 60_000))
    const elapsedText = this.formatDuration(elapsed)
    if (pausedMin <= 0) return elapsedText
    return `${elapsedText} (paused ${this.formatDuration(pausedMin)})`
  }

  private formatDuration(minutes: number): string {
    const total = Math.max(0, Math.round(minutes))
    const days = Math.floor(total / (24 * 60))
    const hours = Math.floor((total % (24 * 60)) / 60)
    const mins = total % 60

    if (days > 0) return `${days}D ${hours}H ${mins}M`
    if (hours > 0) return `${hours}H ${mins}M`
    return `${mins}M`
  }

  private toLocalIso(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
  }
}
