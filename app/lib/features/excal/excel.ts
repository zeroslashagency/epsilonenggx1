import * as XLSX from 'xlsx-js-style'
import type { ExcalPipelineOutput, ExcalRow, ExportLogRow, OperatorSummaryRow, WOBreakdownRow } from './types'

const LOG_HEADERS = [
  'S.No',
  'Log Time',
  'Action',
  'Job Tag',
  'Summary / Notes',
  'WO Core',
  'Setup / Device',
  'Job Type',
  'Operator',
] as const

function formatDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString()
}

function actionForExport(row: ExcalRow): string {
  if (row.action === 'WO_HEADER') return 'WO_HEADER'
  if (row.action === 'WO_SUMMARY') return 'WO_SUMMARY'
  if (row.action === 'PAUSE_BANNER') return 'PAUSE_BANNER'
  return row.action
}

function summaryForExport(row: ExcalRow): string {
  if (row.action === 'WO_SUMMARY') {
    return 'WO summary banner'
  }
  return [row.summary, row.notes].filter(Boolean).join(' | ')
}

function woCoreForExport(row: ExcalRow): string {
  const wo = row.woCode ?? (row.woId !== null ? `WO-${row.woId}` : 'WO-NA')
  const part = row.partNo ?? '-'
  const pcl = row.pclSec ?? '-'
  const target = row.targetDurationSec ?? '-'
  return `${wo} | Part:${part} | Target:${target} | PCL:${pcl}`
}

function setupDeviceForExport(row: ExcalRow): string {
  const device = row.deviceName || (row.deviceId !== null ? `Device ${row.deviceId}` : 'Device -')
  return device
}

function mapRowsForLogs(rows: ExcalRow[]): ExportLogRow[] {
  return rows.map((row) => ({
    serial: row.sNo ?? '',
    logTime: formatDate(row.logTimeIso),
    action: actionForExport(row),
    jobTag: row.isLoadingSeparator ? '' : row.jobTag,
    summaryNotes: summaryForExport(row),
    woCore: woCoreForExport(row),
    setupDevice: setupDeviceForExport(row),
    jobType: row.jobTypeLabel,
    operator: row.operator ?? '-',
    row,
  }))
}

function colLetter(index: number): string {
  let output = ''
  let current = index
  while (current >= 0) {
    output = String.fromCharCode((current % 26) + 65) + output
    current = Math.floor(current / 26) - 1
  }
  return output
}

function setCellStyle(ws: XLSX.WorkSheet, address: string, style: any): void {
  const cell = ws[address]
  if (!cell) return
  cell.s = {
    ...(cell.s || {}),
    ...style,
  }
}

function setBorder(ws: XLSX.WorkSheet, rowIndex: number, colIndex: number, border: any): void {
  const address = `${colLetter(colIndex)}${rowIndex}`
  const cell = ws[address]
  if (!cell) return

  const existing = (cell.s && (cell.s as any).border) || {}
  setCellStyle(ws, address, {
    border: {
      ...existing,
      ...border,
    },
  })
}

function buildLogsSheet(rows: ExcalRow[]): XLSX.WorkSheet {
  const mapped = mapRowsForLogs(rows)
  const aoa: Array<Array<string | number>> = [
    [...LOG_HEADERS],
    ...mapped.map((item) => [
      item.serial,
      item.logTime,
      item.action,
      item.jobTag,
      item.summaryNotes,
      item.woCore,
      item.setupDevice,
      item.jobType,
      item.operator,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 38 },
    { wch: 34 },
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
  ]

  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  ws['!autofilter'] = { ref: `A1:I${aoa.length}` }
  ws['!rows'] = ws['!rows'] || []

  for (let col = 0; col < LOG_HEADERS.length; col += 1) {
    const headerCell = `${colLetter(col)}1`
    setCellStyle(ws, headerCell, {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F2937' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '111111' } },
        bottom: { style: 'thin', color: { rgb: '111111' } },
        left: { style: 'thin', color: { rgb: '111111' } },
        right: { style: 'thin', color: { rgb: '111111' } },
      },
    })
  }

  const groupRows = new Map<string, number[]>()

  mapped.forEach((item, idx) => {
    const excelRowNumber = idx + 2
    const groupId = item.row.groupId
    if (groupId) {
      const bucket = groupRows.get(groupId)
      if (bucket) bucket.push(excelRowNumber)
      else groupRows.set(groupId, [excelRowNumber])
    }

    if (item.row.action === 'WO_SUMMARY') {
      ws['!merges'] = ws['!merges'] || []
      const rowIdxZero = excelRowNumber - 1
      ws['!merges'].push(
        { s: { r: rowIdxZero, c: 0 }, e: { r: rowIdxZero, c: 2 } },
        { s: { r: rowIdxZero, c: 3 }, e: { r: rowIdxZero, c: 5 } },
        { s: { r: rowIdxZero, c: 6 }, e: { r: rowIdxZero, c: 8 } }
      )

      ws[`A${excelRowNumber}`] = { t: 's', v: `WO INFO\n${item.row.summary}` }
      ws[`D${excelRowNumber}`] = { t: 's', v: `TIME / KPI\n${item.row.notes}` }
      ws[`G${excelRowNumber}`] = { t: 's', v: 'OUTPUT + COMMENTS' }

      ws['!rows']![rowIdxZero] = { hpt: 130 }

      setCellStyle(ws, `A${excelRowNumber}`, {
        alignment: { vertical: 'top', wrapText: true },
        fill: { fgColor: { rgb: 'EEF2FF' } },
        font: { bold: true },
      })
      setCellStyle(ws, `D${excelRowNumber}`, {
        alignment: { vertical: 'top', wrapText: true },
        fill: { fgColor: { rgb: 'ECFDF5' } },
        font: { bold: true },
      })
      setCellStyle(ws, `G${excelRowNumber}`, {
        alignment: { vertical: 'top', wrapText: true },
        fill: { fgColor: { rgb: 'FEF3C7' } },
        font: { bold: true },
      })
    }
  })

  for (const [, indexes] of groupRows.entries()) {
    const ordered = [...indexes].sort((a, b) => a - b)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]

    for (const rowNumber of ordered) {
      for (let col = 0; col < LOG_HEADERS.length; col += 1) {
        const border: any = {
          left: { style: 'thick', color: { rgb: '111111' } },
        }

        if (rowNumber === first) {
          border.top = { style: 'thick', color: { rgb: '111111' } }
        }

        if (rowNumber === last) {
          border.bottom = { style: 'thick', color: { rgb: '111111' } }
        }

        setBorder(ws, rowNumber, col, border)
      }
    }

    setCellStyle(ws, `D${first}`, {
      fill: { fgColor: { rgb: 'DBEAFE' } },
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    })
  }

  return ws
}

function appendSectionTitle(sheetData: Array<Array<string | number>>, title: string): void {
  sheetData.push([title])
}

function pushWOBreakdown(sheetData: Array<Array<string | number>>, rows: WOBreakdownRow[]): number[] {
  const rejectCellRows: number[] = []
  appendSectionTitle(sheetData, 'WO Breakdown')
  sheetData.push(['WO', 'Cycles', 'GOOD', 'WARNING', 'BAD', 'Total Duration (sec)', 'Reject Qty'])
  rows.forEach((row) => {
    sheetData.push([row.woCode, row.cycles, row.good, row.warning, row.bad, row.totalDurationSec, row.rejectQty])
    if (row.rejectQty > 0) {
      rejectCellRows.push(sheetData.length)
    }
  })
  sheetData.push([])
  return rejectCellRows
}

function pushOperatorSummary(sheetData: Array<Array<string | number>>, rows: OperatorSummaryRow[]): number[] {
  const rejectCellRows: number[] = []
  appendSectionTitle(sheetData, 'Operator Summary')
  sheetData.push(['Operator', 'Cycles', 'GOOD', 'WARNING', 'BAD', 'Reject Qty'])
  rows.forEach((row) => {
    sheetData.push([row.operator, row.cycles, row.good, row.warning, row.bad, row.rejectQty])
    if (row.rejectQty > 0) {
      rejectCellRows.push(sheetData.length)
    }
  })
  return rejectCellRows
}

function buildAnalysisSheet(payload: ExcalPipelineOutput): XLSX.WorkSheet {
  const rows: Array<Array<string | number>> = []

  appendSectionTitle(rows, 'KPI Summary')
  rows.push(['Metric', 'Value'])
  rows.push(['Total Classified Cycles', payload.kpis.totalCycles])
  rows.push(['GOOD', payload.kpis.goodCycles])
  rows.push(['WARNING', payload.kpis.warningCycles])
  rows.push(['BAD', payload.kpis.badCycles])
  rows.push(['GOOD Rate %', payload.kpis.goodRatePct])
  rows.push(['Average Duration (sec)', payload.kpis.avgDurationSec])
  rows.push(['Average Ideal (sec)', payload.kpis.avgIdealSec])
  rows.push(['Average Variance (sec)', payload.kpis.avgVarianceSec])
  rows.push([])

  const woRejectRows = pushWOBreakdown(rows, payload.woBreakdown)
  const operatorRejectRows = pushOperatorSummary(rows, payload.operatorSummary)

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }]

  const titleRows = [1, 11 + (payload.woBreakdown.length || 0), 13 + (payload.woBreakdown.length || 0)]
  titleRows.forEach((rowNumber) => {
    setCellStyle(ws, `A${rowNumber}`, {
      font: { bold: true, sz: 14 },
      fill: { fgColor: { rgb: 'E5E7EB' } },
    })
  })

  const rejectRows = new Set<number>([...woRejectRows, ...operatorRejectRows])
  rejectRows.forEach((rowNumber) => {
    const candidateCells = [`G${rowNumber}`, `F${rowNumber}`]
    candidateCells.forEach((address) => {
      if (!ws[address]) return
      const numeric = Number(ws[address].v)
      if (Number.isFinite(numeric) && numeric > 0) {
        setCellStyle(ws, address, {
          font: { bold: true, color: { rgb: 'B91C1C' } },
          fill: { fgColor: { rgb: 'FEE2E2' } },
        })
      }
    })
  })

  return ws
}

export function buildExcalWorkbook(payload: ExcalPipelineOutput): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  const logsSheet = buildLogsSheet(payload.rows)
  const analysisSheet = buildAnalysisSheet(payload)

  XLSX.utils.book_append_sheet(workbook, logsSheet, 'Logs')
  XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analysis')

  return workbook
}

export function exportWorkbookToFile(payload: ExcalPipelineOutput, fileName: string): void {
  const workbook = buildExcalWorkbook(payload)
  XLSX.writeFile(workbook, fileName)
}
