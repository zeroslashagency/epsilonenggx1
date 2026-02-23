import * as XLSX from 'xlsx'

import { buildSchedulingWorkbook } from '@/app/lib/features/scheduling/excel-export'

describe('scheduling excel export', () => {
  it('builds workbook with required sheets and output headers', () => {
    const workbook = buildSchedulingWorkbook({
      results: [
        {
          partNumber: 'PN7001',
          orderQty: 400,
          priority: 'Normal',
          batchId: 'B01',
          batchQty: 200,
          operationSeq: 1,
          operationName: 'Facing',
          machine: 'VMC 2',
          person: 'A',
          setupStart: '2026-02-22 06:00',
          setupEnd: '2026-02-22 07:40',
          runStart: '2026-02-22 07:40',
          runEnd: '2026-02-22 18:39',
          timing: '12H 39M (paused 1H due to shift gaps)',
          dueDate: '',
          machineAvailabilityStatus: 'FIXED_VALIDATED | SELECTED: VMC 2',
        },
        {
          partNumber: 'PN7001',
          orderQty: 400,
          priority: 'Normal',
          batchId: 'B01',
          batchQty: 200,
          operationSeq: 2,
          operationName: 'Facing',
          machine: 'VMC 1',
          person: 'A',
          setupStart: '2026-02-22 07:43',
          setupEnd: '2026-02-22 09:23',
          runStart: '2026-02-22 09:23',
          runEnd: '2026-02-25 18:00',
          timing: '4D 8H 37M (paused 5H due to shift gaps)',
          dueDate: '',
          machineAvailabilityStatus: 'FIXED_VALIDATED | SELECTED: VMC 1',
        },
      ],
      holidays: [
        {
          startDateTime: '2026-02-23T00:00:00.000Z',
          endDateTime: '2026-02-23T23:59:00.000Z',
        },
      ],
      breakdowns: [
        {
          machines: ['VMC 6'],
          startDateTime: '2026-02-24T06:00:00.000Z',
          endDateTime: '2026-02-24T10:00:00.000Z',
          reason: 'Maintenance',
        },
      ],
      qualityReport: {
        issues: [
          {
            rule: 'No Available Machine',
            severity: 'critical',
            message: 'PNX/B01/OP3 no machine available',
          },
        ],
      },
      generatedAt: new Date('2026-02-22T12:00:00.000Z'),
    })

    expect(workbook.SheetNames).toEqual([
      'Output',
      'Setup_output',
      'Output_2',
      'Client_Out',
      'Fixed_Report',
    ])

    const outputSheet = workbook.Sheets.Output
    const outputRows = XLSX.utils.sheet_to_json(outputSheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >

    expect(outputRows[0]).toEqual([
      'PartNumber',
      'Order_Quantity',
      'Priority',
      'Batch_ID',
      'Batch_Qty',
      'OperationSeq',
      'OperationName',
      'Machine',
      'Person',
      'SetupStart',
      'SetupEnd',
      'RunStart',
      'RunEnd',
      'Timing',
      'DueDate',
      'BreakdownMachine',
      'Global_Holiday_Periods',
      'Operator',
      'Machine_Availability_STATUS',
    ])

    expect(String(outputRows[1][0])).toBe('PN7001')
    expect(String(outputRows[1][9])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:00$/)
    expect(String(outputRows[1][12])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:00$/)
    expect(String(outputRows[outputRows.length - 1][0])).toBe('TOTAL (Timing)')

    const setupSheet = workbook.Sheets.Setup_output
    const setupRows = XLSX.utils.sheet_to_json(setupSheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >
    expect(setupRows[0]).toEqual([
      'PartNumber',
      'Order_Quantity',
      'Batch_Qty',
      'OperationSeq',
      'Machine',
      'Person',
      'Production_Person',
      'SetupStart',
      'SetupEnd',
      'Timing',
    ])

    const clientSheet = workbook.Sheets.Client_Out
    const clientRows = XLSX.utils.sheet_to_json(clientSheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >
    expect(clientRows[0]).toEqual([
      'PartNumber',
      'Order_Quantity',
      'Timing',
      'Start Date',
      'Expected Delivery Date',
    ])

    const reportSheet = workbook.Sheets.Fixed_Report
    const reportRows = XLSX.utils.sheet_to_json(reportSheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >

    expect(String(reportRows[0][0])).toBe('FIXED UNIFIED SCHEDULING ENGINE REPORT')
    expect(reportRows.some(row => String(row[0]) === 'SUCCESSFUL ASSIGNMENTS')).toBe(true)
  })
})
