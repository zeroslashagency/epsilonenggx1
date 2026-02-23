# Multi-Sheet Excel Export Plan (Workflow x10.x4 format)

## Goal
Export scheduler results to an `.xlsx` file matching your template behavior for these sheets:
1. `Output`
2. `Setup_output`
3. `Output_2`
4. `Client_Out`
5. `Fixed_Report`

## Current Gap
- Current scheduler export in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx` writes a single-sheet export via global `exportToExcel` (or CSV fallback).
- It does not produce the 5 required sheets in one workbook.

## Contract from your workbook (`/Users/xoxo/Downloads/Workflow x10.x4.xlsx`)

### Sheet: `Output`
Header order must be exactly:
- `PartNumber`
- `Order_Quantity`
- `Priority`
- `Batch_ID`
- `Batch_Qty`
- `OperationSeq`
- `OperationName`
- `Machine`
- `Person`
- `SetupStart`
- `SetupEnd`
- `RunStart`
- `RunEnd`
- `Timing`
- `DueDate`
- `BreakdownMachine`
- `Global_Holiday_Periods`
- `Operator`
- `Machine_Availability_STATUS`

Row rule:
- One row per scheduled operation.
- Include total row at end: `TOTAL (Timing)` in first column and summed timing text in `RunEnd` column (template behavior).

### Sheet: `Setup_output`
Header order:
- `PartNumber`, `Order_Quantity`, `Batch_Qty`, `OperationSeq`, `Machine`, `Person`, `SetupStart`, `SetupEnd`, `Timing`

Row rule:
- One row per setup event.
- `Timing` = setup duration string only (include paused note if setup paused).

### Sheet: `Output_2`
Header order:
- `Part Number`, `Quantity`, `Batch Size`, `Date & Time`, `Machine`, `Expected Delivery Date`

Row rule:
- One row per scheduled operation.
- `Date & Time` = operation setup end (template pattern).
- `Expected Delivery Date` = operation run end.

### Sheet: `Client_Out`
Header order:
- `PartNumber`, `Order_Quantity`, `Timing`, `Start Date`, `Expected Delivery Date`

Row rule:
- One row per `PartNumber` aggregate.
- `Start Date` = min setup start across rows for that part.
- `Expected Delivery Date` = max run end across rows for that part.
- `Timing` = overall span + paused summary for that part.

### Sheet: `Fixed_Report`
Sections (in this order):
1. Title + generated timestamp
2. KPI lines: exclusion rules, total assignments, total rejections, total reschedules, validation failures
3. `EXCLUSION MATRIX` table
4. `SUCCESSFUL ASSIGNMENTS` table with columns:
- `Machine`, `Operation`, `Final Window`, `Original Window`, `Attempts`, `Rescheduled`

## Implementation Tasks
- [ ] Task 1: Build dedicated exporter module
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/excel-export.ts`
  - Verify: exposes `buildSchedulingWorkbook(payload)` + `exportSchedulingWorkbook(payload, fileName)`.

- [ ] Task 2: Add canonical row normalizer
  - Normalize scheduler rows from both engines into one typed shape.
  - Verify: handles camelCase/snake_case field variants safely.

- [ ] Task 3: Implement `Output` sheet mapper
  - Map each operation row to exact header contract.
  - Verify: header order exact, row count equals scheduled operation count, includes total timing row.

- [ ] Task 4: Implement `Setup_output` sheet mapper
  - Derive one row per setup event from same normalized rows.
  - Verify: setup timing uses setup start/end and pause note where available.

- [ ] Task 5: Implement `Output_2` and `Client_Out` mappers
  - `Output_2`: simplified per-operation rows.
  - `Client_Out`: grouped by part with span and paused summary.
  - Verify: part aggregates match min/max timestamps from `Output`.

- [ ] Task 6: Implement `Fixed_Report` builder
  - Fill KPI counters + exclusion matrix + assignment rows.
  - Source counters from schedule metadata/quality report/validation.
  - Verify: required section labels and columns exist in proper order.

- [ ] Task 7: Wire scheduler button to new exporter
  - Update `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx` `handleExportExcel` to call new module directly.
  - Remove dependency on missing global `ExcelExporter` path.
  - Verify: clicking `Export Excel` downloads workbook with 5 sheets every time.

- [ ] Task 8: Add export tests (small -> big)
  - Add test file: `/Users/xoxo/Desktop/epsilonschedulingmain 2/tests/test_scheduler_excel_export.ts`.
  - Cases:
    - Small: 2 ops, 1 batch
    - Medium: 50+ rows
    - Large: 250+ rows
  - Verify: sheet names, headers, row counts, aggregate totals all correct.

## Acceptance Criteria
- [ ] Workbook contains sheets: `Output`, `Setup_output`, `Output_2`, `Client_Out`, `Fixed_Report`.
- [ ] Each sheet has exact header names/order from template.
- [ ] `Output` is one row per scheduled operation with setup + run timestamps + timing string.
- [ ] `Setup_output` is one row per setup event.
- [ ] `Output_2` and `Client_Out` match template semantics.
- [ ] `Fixed_Report` includes exclusions/assignments/rejections/reschedules/validation summary.
- [ ] Export works even when legacy browser modules are disabled.

## Run/Verify Commands (after implementation)
```bash
cd "/Users/xoxo/Desktop/epsilonschedulingmain 2"
npm run test -- test_scheduler_excel_export.ts
```

Manual check:
- Run schedule in UI -> click `Export Excel` -> open workbook -> verify 5 target sheets and headers.
