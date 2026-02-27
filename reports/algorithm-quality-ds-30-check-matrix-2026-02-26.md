# Algorithm Quality + Data Science 30-Check Matrix

Date: 2026-02-26  
Scope: batch split quality, setup/run assignment quality, and utilization reliability for Basic vs Advanced modes.

Artifacts to evaluate:

- Input: `/Users/xoxo/Downloads/import_input (2).xlsx`
- Advanced sample: `/Users/xoxo/Downloads/production_schedule_2026-02-25T19-18-46.xlsx`
- Fresh run outputs to generate: `advanced_new.xlsx`, `basic_new.xlsx`

## KPI policy (locked)

- `Run Util` = run-only utilization (setup excluded) for people.
- Setup time is validated separately from `Setup_output`, `Personnel_Event_Log`, and `Personnel_Personnel`.

## How to run

- Run commands per check block.
- Record each check as `PASS | FAIL | BLOCKED`.
- For FAIL/BLOCKED, attach evidence path and short root cause.

## 30 checks

| ID     | Category                 | Mode | Command / Method                                                                                | Acceptance Threshold           |
| ------ | ------------------------ | ---- | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| ALG-01 | Export contract          | Both | `npm run test:scheduler:excel-contract`                                                         | Passes fully                   |
| ALG-02 | Mode engine behavior     | Both | `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` | Passes fully                   |
| ALG-03 | Personnel parsing        | Both | `npx jest --runInBand app/lib/features/scheduling/__tests__/personnel-v2.test.ts`               | Passes fully                   |
| ALG-04 | PRD deterministic checks | Both | `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts`   | Passes fully                   |
| ALG-05 | Stability rerun          | Both | Repeat ALG-04 twice                                                                             | Same test results in both runs |

| ALG-06 | Batch split qty conservation | Both | Validate each part: `sum(Batch Qty) == Order Qty` from `Output` | Exact equality (0 tolerance) |
| ALG-07 | Batch IDs monotonic | Both | Inspect `Batch ID` sequence per part | No duplicate collision per operation row key |
| ALG-08 | Single/custom/auto behavior | Both | Run targeted test scenarios (existing + manual workbook checks) | Split pattern matches mode rules |
| ALG-09 | Minimum batch compliance | Both | For each op, compare `Batch Qty >= Minimum_BatchSize` for generated batch rows | 100% compliant |
| ALG-10 | Multi-op continuity | Both | Check `Operation Seq` increments for same `Part+Batch` | No backward/skip anomalies |

| ALG-11 | Advanced setup presence | Advanced | Verify sheet list in workbook | `Setup_output` exists |
| ALG-12 | Basic setup exclusion | Basic | Verify sheet list in workbook | `Setup_output` absent |
| ALG-13 | Setup events only advanced | Both | Count `Activity_Type=SETUP` in `Personnel_Event_Log` | Advanced > 0, Basic = 0 |
| ALG-14 | Setup person usage | Advanced | Group SETUP events by `Name` | Setup users (`settings-*`) appear |
| ALG-15 | Setup minutes rollup | Advanced | Sum `Setup_Minutes` in `Personnel_Personnel` | Setup users have non-zero minutes |

| ALG-16 | Run util definition consistency | Both | Compare UI Run Util policy vs engine formula | Formula meaning documented + consistent |
| ALG-17 | Machine util boundedness | Both | Inspect machine util KPI outputs | All values in [0,100] |
| ALG-18 | Run util boundedness | Both | Inspect Run Util KPI outputs | All values in [0,100] |
| ALG-19 | Queue metric sanity | Both | Validate `avgQueueHours` non-negative and finite | `>= 0` and not NaN |
| ALG-20 | Span metric sanity | Both | Validate `totalSpanHours` non-negative and finite | `>= 0` and not NaN |

| ALG-21 | Output datetime quality | Both | Regex-check `Run Start`/`Run End` in export | 100% parseable `DD/MM/YYYY, HH:mm:ss` |
| ALG-22 | Timing vs timestamps | Both | Recompute `Timing` using mode semantics: Advanced=`Setup Start -> Run End` (via `Setup_output` + `Output`), Basic=`Run Start -> Run End` | <= 2 min diff equivalent |
| ALG-23 | Status contract | Both | Check `Status` column values | Default `Scheduled` unless explicit override |
| ALG-24 | Missing critical fields | Both | Null scan on key columns | 0 missing for key fields |
| ALG-25 | Legacy/new header drift | Both | Compare `Output` header row against approved 14-column contract | Exact match |

| ALG-26 | Assignment fairness (people) | Both | CV on run minutes by person from event log | CV <= 0.60 (warning), <= 0.75 (hard fail) |
| ALG-27 | Assignment fairness (machines) | Both | CV on run minutes by machine from output/event log | CV <= 0.65 (warning), <= 0.80 (hard fail) |
| ALG-28 | Distribution drift (run durations) | Both | Compare to baseline using KS or quantile deltas | No severe drift (p<0.01 + large effect) |
| ALG-29 | Advanced vs Basic delta | Both | Compare on-time%, queue hours, makespan between modes | Advanced not worse by >5% on primary KPI |
| ALG-30 | Release decision gate | Both | Aggregate checks 01-29 | GO only if 0 hard fails |

## Suggested evidence structure

- `reports/artifacts/alg-quality/<run-id>/commands.log`
- `reports/artifacts/alg-quality/<run-id>/workbooks/`
- `reports/artifacts/alg-quality/<run-id>/metrics.json`
- `reports/artifacts/alg-quality/<run-id>/summary.md`

## Missing today (what to add next)

- Dedicated tests for `computeQualityMetrics` math and denominator policy.
- Shared canonical utilization function used by engine + UI + dashboard.
- Automated drift script (KS/quantile checks) wired into CI as non-flaky gate.
