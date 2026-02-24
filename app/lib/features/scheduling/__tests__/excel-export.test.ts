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
      personnelProfiles: [
        {
          uid: 'U001',
          name: 'Ravi',
          sourceSection: 'setup',
          levelUp: 1,
          setupEligible: true,
          productionEligible: true,
          setupPriority: 1,
        },
        {
          uid: 'U002',
          name: 'A',
          sourceSection: 'production',
          levelUp: 0,
          setupEligible: false,
          productionEligible: true,
          setupPriority: 99,
        },
      ],
      shiftSettings: {
        shift1: '06:00-14:00',
        shift2: '14:00-22:00',
        shift3: '22:00-06:00',
        globalSetupWindow: '06:00-22:00',
      },
      generatedAt: new Date('2026-02-22T12:00:00.000Z'),
    })

    expect(workbook.SheetNames).toEqual([
      'Output',
      'Setup_output',
      'Output_2',
      'Client_Out',
      'Personnel_Event_Log',
      'Personnel_Personnel',
      'Percent_Report',
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
    expect(String(setupRows[1][7])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:00$/)
    expect(String(setupRows[1][8])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:00$/)

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
    expect(String(clientRows[1][3])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)
    expect(String(clientRows[1][4])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)

    const output2Sheet = workbook.Sheets.Output_2
    const output2Rows = XLSX.utils.sheet_to_json(output2Sheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >
    expect(String(output2Rows[1][3])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)
    expect(String(output2Rows[1][5])).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/)

    const personnelEventSheet = workbook.Sheets.Personnel_Event_Log
    const personnelEventRows = XLSX.utils.sheet_to_json(personnelEventSheet, {
      header: 1,
      defval: '',
    }) as Array<Array<string>>
    expect(personnelEventRows[0]).toEqual([
      'Event_Group_ID',
      'Slice_Index',
      'Event_DateTime',
      'Event_Date',
      'Event_Time',
      'Shift_Date',
      'Shift_Day',
      'UID',
      'Name',
      'Source_Section',
      'Role',
      'Activity_Type',
      'PartNumber',
      'Batch_ID',
      'OperationSeq',
      'OperationName',
      'Machine',
      'Start_Time',
      'End_Time',
      'Duration_Min',
      'Original_Start_DateTime',
      'Original_End_DateTime',
      'Original_Duration_Min',
      'Shift_Label',
      'Shift_Window',
      'Ref_Key',
    ])
    expect(personnelEventRows.length).toBeGreaterThan(1)
    const eventGroupIndex = personnelEventRows[0].indexOf('Event_Group_ID')
    const activityTypeIndex = personnelEventRows[0].indexOf('Activity_Type')
    const operationIndex = personnelEventRows[0].indexOf('OperationSeq')
    const runGroups = new Map<string, number>()
    personnelEventRows.slice(1).forEach(row => {
      if (String(row[activityTypeIndex]) !== 'RUN') return
      if (String(row[operationIndex]) !== '2') return
      const key = String(row[eventGroupIndex])
      runGroups.set(key, (runGroups.get(key) || 0) + 1)
    })
    expect(Array.from(runGroups.values()).some(count => count >= 3)).toBe(true)

    const personnelSummarySheet = workbook.Sheets.Personnel_Personnel
    const personnelSummaryRows = XLSX.utils.sheet_to_json(personnelSummarySheet, {
      header: 1,
      defval: '',
    }) as Array<Array<string>>
    expect(personnelSummaryRows[0]).toEqual([
      'Week_Start',
      'Date',
      'Day',
      'UID',
      'Name',
      'Source_Section',
      'Setup_Eligible',
      'Production_Eligible',
      'Setup_Priority',
      'Assigned_Shift_Label',
      'Assigned_Shift_Window',
      'First_Activity_Time',
      'Last_Activity_Time',
      'Setup_Minutes',
      'Run_Minutes',
      'Total_Work_Minutes',
      'Event_Count',
      'Ops_Count',
      'Machines_Used',
    ])
    expect(personnelSummaryRows.length).toBeGreaterThanOrEqual(8)

    const percentReportSheet = workbook.Sheets.Percent_Report
    const percentReportRows = XLSX.utils.sheet_to_json(percentReportSheet, {
      header: 1,
      defval: '',
    }) as Array<Array<string>>
    expect(String(percentReportRows[0][0])).toBe('No.S')
    expect(String(percentReportRows[0][1])).toBe('Name')
    expect(String(percentReportRows[1][2])).toBe('Shift 1')
    expect(String(percentReportRows[1][3])).toBe('Shift 2')
    expect(String(percentReportRows[1][4])).toBe('Shift 3')

    const percentBodyRows = percentReportRows.slice(2)
    const joinedCells = percentBodyRows.flat().map(cell => String(cell))
    expect(joinedCells.some(cell => /\bVMC\b/.test(cell))).toBe(true)
    expect(joinedCells.some(cell => /\(\d{2}:\d{2}-\d{2}:\d{2}\)/.test(cell))).toBe(true)
    expect(joinedCells.some(cell => /\[(SETUP|RUN)\]/.test(cell))).toBe(true)
    expect(joinedCells.some(cell => /\bPN7001\/OP\d+\b/.test(cell))).toBe(true)
    expect(joinedCells.includes('X')).toBe(true)

    const reportSheet = workbook.Sheets.Fixed_Report
    const reportRows = XLSX.utils.sheet_to_json(reportSheet, { header: 1, defval: '' }) as Array<
      Array<string>
    >

    expect(String(reportRows[0][0])).toBe('FIXED UNIFIED SCHEDULING ENGINE REPORT')
    expect(reportRows.some(row => String(row[0]) === 'SUCCESSFUL ASSIGNMENTS')).toBe(true)
  })
})
