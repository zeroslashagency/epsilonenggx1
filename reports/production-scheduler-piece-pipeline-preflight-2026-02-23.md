# Production Scheduler Piece Pipeline Preflight Report

Date: 2026-02-23
Dataset: `/Users/xoxo/Downloads/import_input.xlsx`
Scope: Baseline sanity before full 120-case / 500-check execution

## 1) Commands Executed

```bash
npx jest app/lib/features/scheduling/__tests__/import-input.integration.test.ts --runInBand
npx jest app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts --runInBand
python3 scripts/piece_level_verifier.py --demo batch3 --out-dir out/prd-preflight-batch3
python3 scripts/piece_level_verifier.py --demo batch250 --out-dir out/prd-preflight-batch250
python3 scripts/piece_conflict_suite.py --out-dir out/prd-preflight-conflicts
```

## 2) Input Dataset Fingerprint (Quick Stats)

- Workbook sheet: `Sheet1`
- Total rows parsed: `82`
- Operation rows detected: `82`
- Distinct part numbers: `33`
- Personnel-like rows detected: `9`
- Missing cycle/setup/min-batch/eligible values in detected operation rows: `0`
- Handle mode distribution:
  - `SINGLE MACHINE`: `77`
  - `DOUBLE MACHINE`: `5`

## 3) Test Results

### 3.1 Jest Integration

- `import-input.integration.test.ts`: PASS (1/1)
  - Validates parsing and scheduling with real names from `/Users/xoxo/Downloads/import_input.xlsx`
- `deterministic-handle-modes.test.ts`: PASS (9/9)
  - Validates single/double overlap policy, setup/run person constraints, breakdown and holiday behavior

### 3.2 Python Verifier Smoke Runs

- `batch3` run: PASS
  - `valid=true`, `errors=0`, `warnings=0`
  - `operation_rows=4`, `piece_rows=12`
  - Artifacts in `out/prd-preflight-batch3`

- `batch250` run: PASS with due warnings
  - `valid=true`, `errors=0`, `warnings=4`
  - `operation_rows=4`, `piece_rows=1000`
  - Warnings are due-date misses for all 4 operations
  - Artifacts in `out/prd-preflight-batch250`

### 3.3 Conflict Suite

- Suite run: PASS
  - `total=8`, `passed=8`, `failed=0`, `all_passed=true`
  - Includes expected detections for machine availability, person conflict, PN conflict
  - Artifacts in `out/prd-preflight-conflicts`

## 4) Key Observations

- Current pipeline is operational for your real Excel input path and existing integration tests pass.
- Baseline conflict taxonomy checks pass across small, medium, and large seeded scenarios.
- Large demo (`batch250`) is structurally valid but generates due warnings; this is expected and should be scored under warning policy during full run.
- Full PRD checklist is defined in `reports/production-scheduler-piece-pipeline-prd-500-checks.md`.

## 5) Ready State for Full Run

- Preflight gate: PASS
- Recommended next action: execute the 120-case matrix and score all CHK-001..CHK-500 checks with evidence links.
