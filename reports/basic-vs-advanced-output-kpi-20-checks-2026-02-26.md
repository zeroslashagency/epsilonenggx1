# Basic vs Advanced Output + KPI Validation (20 Checks)

Scope: verify mode separation and explain the Person Utilization mismatch risk using the same dataset.

Dataset references:

- Input: `/Users/xoxo/Downloads/import_input (2).xlsx`
- Advanced sample output (legacy export): `/Users/xoxo/Downloads/production_schedule_2026-02-25T19-18-46.xlsx`

Run references to generate during validation:

- `advanced_new.xlsx` (current exporter)
- `basic_new.xlsx` (current exporter)

Pass criteria summary:

- Mode separation must be explicit and stable.
- Output contract must match the requested 14 columns.
- Advanced setup evidence must exist in setup/event sheets.
- KPI definition must be documented and consistent with chosen policy.

## 20-Check Sheet

| ID    | Area             | Mode     | Check                             | How to Verify                                         | Expected Result                                                                                                                                                    | Severity |
| ----- | ---------------- | -------- | --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BA-01 | Input parse      | Both     | Setup marker recognized           | Inspect parsed personnel summary from import          | `Setup-person` block is detected                                                                                                                                   | Critical |
| BA-02 | Input parse      | Both     | Setup users loaded                | Confirm `settings-1..4` are in imported profiles      | Setup users present with setup eligibility                                                                                                                         | Critical |
| BA-03 | Input parse      | Both     | Production users loaded           | Confirm `operater-1..4` are in imported profiles      | Production users present                                                                                                                                           | Critical |
| BA-04 | Engine routing   | Basic    | Basic path used                   | Verify `profileMode=basic` run and inspect row fields | Setup duration is zero in row semantics                                                                                                                            | Critical |
| BA-05 | Engine routing   | Advanced | Advanced path used                | Verify `profileMode=advanced` run and inspect rows    | Setup start/end present and non-zero for setup-required ops                                                                                                        | Critical |
| BA-06 | Output contract  | Both     | Output header order               | Read `Output` row 1 from generated xlsx               | Exactly: `Part Number, Order Qty, Priority, Batch ID, Batch Qty, Operation Seq, Operation Name, Machine, Run Person, Run Start, Run End, Timing, Due Date, Status` | Blocker  |
| BA-07 | Output contract  | Both     | Required columns non-empty        | Sample 20 rows in `Output`                            | No blanks in key fields except `Due Date` if missing input                                                                                                         | Critical |
| BA-08 | Output contract  | Both     | Date format                       | Validate `Run Start`/`Run End` pattern                | `DD/MM/YYYY, HH:mm:ss`                                                                                                                                             | Major    |
| BA-09 | Output contract  | Both     | Timing integrity                  | Compare `Timing` vs start/end duration                | Timing is consistent (allow expected pause annotation policy)                                                                                                      | Critical |
| BA-10 | Output contract  | Both     | Status values                     | Inspect `Status` column                               | Default `Scheduled` unless explicit other status exists                                                                                                            | Major    |
| BA-11 | Mode separation  | Basic    | Setup sheet excluded              | Inspect sheet list in `basic_new.xlsx`                | `Setup_output` is absent                                                                                                                                           | Critical |
| BA-12 | Mode separation  | Advanced | Setup sheet included              | Inspect sheet list in `advanced_new.xlsx`             | `Setup_output` is present                                                                                                                                          | Critical |
| BA-13 | Event semantics  | Basic    | No setup events                   | Inspect `Personnel_Event_Log.Activity_Type`           | All events are `RUN`                                                                                                                                               | Critical |
| BA-14 | Event semantics  | Advanced | Setup events present              | Inspect `Personnel_Event_Log.Activity_Type`           | `SETUP` and `RUN` both present                                                                                                                                     | Critical |
| BA-15 | Setup assignment | Advanced | Setup users actually used         | Group `Personnel_Event_Log` by setup user             | `settings-*` entries appear in SETUP events                                                                                                                        | Major    |
| BA-16 | Personnel totals | Advanced | Setup minutes rollup              | Inspect `Personnel_Personnel.Setup_Minutes`           | Setup users have non-zero setup minutes                                                                                                                            | Major    |
| BA-17 | KPI definition   | Advanced | UI Person Util source             | Verify displayed metric source path                   | UI uses engine `qualityMetrics.personUtilPct` when available                                                                                                       | Major    |
| BA-18 | KPI consistency  | Advanced | Run-only vs setup+run explanation | Reconcile KPI with `Personnel_Personnel` totals       | Documented mismatch: KPI run-only; sheet totals include setup+run                                                                                                  | Critical |
| BA-19 | KPI policy       | Both     | Policy decision recorded          | Choose one policy and record in report                | Policy fixed: `Run-only` or `Setup+Run`                                                                                                                            | Blocker  |
| BA-20 | Regression       | Both     | Re-run stability                  | Run same input twice per mode                         | Row count and key scheduling fields remain stable                                                                                                                  | Critical |

## Execution Notes

- Execute checks BA-01..BA-05 during schedule generation validation.
- Execute checks BA-06..BA-16 directly from generated workbook artifacts.
- Execute checks BA-17..BA-19 from code+UI behavior review.
- Execute BA-20 as final regression gate.

## Evidence Template (per failed or critical check)

```
ID:
Mode:
Expected:
Actual:
Status: PASS | FAIL | BLOCKED
Artifact:
Owner:
Fix:
```

## Recommended default policy

- Advanced `Person Util` should be labeled clearly as one of:
  - `Run Util` (current behavior), or
  - `Total Util (Setup+Run)` if formula is changed later.
- Until formula is changed, show `Run Util` label to avoid confusion.
