# Basic vs Advanced Output + KPI Validation Results (20 Checks)

Date: 2026-02-26
Checklist: `reports/basic-vs-advanced-output-kpi-20-checks-2026-02-26.md`

## Execution Summary

- PASS: 20
- FAIL: 0
- BLOCKED: 0
- Decision: **GO** for this 20-check scope.

## Evidence Commands Run

- `npx jest --runInBand app/lib/features/scheduling/__tests__/excel-export.test.ts` (PASS)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (PASS)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/personnel-v2.test.ts` (PASS)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts && npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts` (PASS twice)
- Workbook inspection (Node + `xlsx`) for:
  - `/Users/xoxo/Downloads/import_input (2).xlsx`
  - `/Users/xoxo/Downloads/production_schedule_2026-02-25T19-18-46.xlsx`

## Check Results

| ID    | Status | Evidence                                                                                                                        |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| BA-01 | PASS   | Input workbook has setup marker row (`Production-Person = Setup-person` at row 14).                                             |
| BA-02 | PASS   | Setup users detected in input (`settings-1..4` rows 15-18).                                                                     |
| BA-03 | PASS   | Production users detected (`operater-1..4` in early rows).                                                                      |
| BA-04 | PASS   | Basic mode path verified by tests and engine implementation (`pickBestMachineAndOperatorBasic`, zero setup duration semantics). |
| BA-05 | PASS   | Advanced mode setup+run behavior verified in deterministic mode tests.                                                          |
| BA-06 | PASS   | Output header contract enforced by `excel-export.test.ts` for new exporter format (14 columns).                                 |
| BA-07 | PASS   | Required output fields validated by export contract tests and sample row checks.                                                |
| BA-08 | PASS   | Date format checks pass in exporter tests (`DD/MM/YYYY, HH:mm:ss`).                                                             |
| BA-09 | PASS   | Timing consistency validated in exporter and deterministic scheduling tests.                                                    |
| BA-10 | PASS   | `Status` column present in current export contract; default value `Scheduled`.                                                  |
| BA-11 | PASS   | Basic mode excludes `Setup_output` (asserted in exporter tests).                                                                |
| BA-12 | PASS   | Advanced mode includes `Setup_output` (asserted in exporter tests and sample workbook).                                         |
| BA-13 | PASS   | Basic mode emits RUN-only events (asserted in exporter tests).                                                                  |
| BA-14 | PASS   | Advanced sample workbook contains SETUP + RUN events (`Personnel_Event_Log`: SETUP=8, RUN=112).                                 |
| BA-15 | PASS   | Advanced sample has setup assignments for setup users (`settings-1/2/3` in setup sheets/events).                                |
| BA-16 | PASS   | Advanced sample has non-zero setup totals in `Personnel_Personnel` (`settings-1/2/3`).                                          |
| BA-17 | PASS   | UI `Person Util` source confirmed: prefers `engineQualityMetrics.personUtilPct` when available.                                 |
| BA-18 | PASS   | KPI mismatch documented: engine person util is run-only; export personnel totals include setup+run.                             |
| BA-19 | PASS   | KPI policy finalized as run-only and UI label updated to `Run Util` with explicit tooltip.                                      |
| BA-20 | PASS   | Deterministic PRD checks pass on two consecutive runs (stability signal).                                                       |

## Important Findings

- Advanced setup is working and visible in exports (setup sheets/events/totals).
- Person utilization confusion is real: UI KPI currently reflects run-only logic, while export totals include setup minutes.
- The provided advanced workbook is legacy header format; current exporter contract is now 14-column output and verified by tests.

## BA-19 Closure

- Chosen policy: `Run Util` (current behavior, no formula change).
- Implemented in UI label and tooltip (`app/(app)/scheduler/page.tsx`).
