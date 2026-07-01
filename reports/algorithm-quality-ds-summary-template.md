# Algorithm Quality + DS Validation Summary

Run ID: `<fill-run-id>`  
Date: `<fill-date>`  
Branch: `<fill-branch>`  
Commit: `<fill-commit>`

Input/Output artifacts:

- Input: `/Users/xoxo/Downloads/import_input (2).xlsx`
- Advanced: `<path-to-advanced_new.xlsx>`
- Basic: `<path-to-basic_new.xlsx>`

## Overall Decision

- Total checks: 30
- PASS: `<n>`
- FAIL: `<n>`
- BLOCKED: `<n>`
- Final decision: `GO | NO-GO`

## KPI Policy

- Person KPI label: `Run Util`
- Formula: run-only busy minutes / available run window minutes
- Setup treatment: setup minutes are tracked separately (not part of Run Util)

## Mode Comparison (Advanced vs Basic)

- On-time delta (pp): `<value>`
- Avg queue delta (hours): `<value>`
- Makespan delta (hours): `<value>`
- Machine util delta (pp): `<value>`
- Run util delta (pp): `<value>`

## High-Level Findings

- **Batch split quality:** `<short result>`
- **Setup behavior:** `<short result>`
- **Utilization reliability:** `<short result>`
- **Data quality issues:** `<short result>`

## Failed/Blocked Checks

| ID         | Status         | Why        | Owner     | Fix Plan |
| ---------- | -------------- | ---------- | --------- | -------- |
| `<ALG-xx>` | `FAIL/BLOCKED` | `<reason>` | `<owner>` | `<plan>` |

## Command Log

- `npm run test:scheduler:excel-contract` -> `<pass/fail>`
- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` -> `<pass/fail>`
- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts` -> `<pass/fail>`
- `<additional commands>`

## Evidence Paths

- Metrics JSON: `reports/algorithm-quality-ds-metrics-template.json` (copy to run-specific output)
- Run artifacts root: `reports/artifacts/alg-quality/<run-id>/`
- Workbook snapshots: `reports/artifacts/alg-quality/<run-id>/workbooks/`

## Next Actions

1. `<next action 1>`
2. `<next action 2>`
3. `<next action 3>`
