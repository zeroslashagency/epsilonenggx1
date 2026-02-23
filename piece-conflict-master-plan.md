# Piece Conflict Master Plan (Strict)

## Goal
Add a strict conflict pipeline for piece-level scheduling so every run can be audited for:
- machine conflict
- person conflict
- PN/PEN conflict (part batch operation-chain integrity)
- holiday conflict
- machine availability conflict

## Conflict Definitions (Single Source of Truth)
- `MACHINE_CONFLICT`
  - Rule: same machine has overlap between two operation windows (`SetupStart -> RunEnd`).
- `PERSON_CONFLICT`
  - Rule A: same operator has overlapping setup windows.
  - Rule B (strict mode): same operator has overlapping run windows across machines.
- `PN_CONFLICT` (`PEN` alias)
  - Rule: for each `PartNumber + Batch_ID`, operation sequence must be contiguous from `OP1` with no duplicates/gaps.
- `HOLIDAY_CONFLICT`
  - Rule: setup/run interval intersects any holiday date.
- `MACHINE_AVAILABILITY_CONFLICT`
  - Rule: operation violates rule in `machine_availability`:
    - `PERMANENT`
    - `AVAILABLE_FROM`
    - `RANGE`

## Pipeline Plan
- [ ] Step 1: Normalize input + validate schema
  - Verify: every batch has part/batch/qty/start and operation list.
- [ ] Step 2: Build constraint models
  - Verify: holidays, shifts, breakdowns, machine availability are parsed into deterministic windows.
- [ ] Step 3: Run piece-level schedule
  - Verify: operation rows + piece rows generated deterministically.
- [ ] Step 4: Execute conflict scanner in fixed order
  - Verify: scanner emits only stable codes listed above.
- [ ] Step 5: Compare against testcase expectations
  - Verify: `expected_present` and `expected_absent` both satisfy.
- [ ] Step 6: Export per-case evidence
  - Verify: each case writes `operation_summary.csv`, `piece_timeline.csv`, `conflicts.csv`, `report.json`.
- [ ] Step 7: Report suite score
  - Verify: `suite_report.json` includes total/passed/failed and per-case details.

## Test Strategy (Small -> Big)
- Small
  - `TC01_SMALL_NOMINAL`: baseline, no conflict expected.
  - `TC02_SMALL_MACHINE_AVAILABILITY_BLOCK`: blocked machine used before allowed time.
  - `TC03_SMALL_PERSON_RUN_OVERLAP`: strict person policy catches cross-machine run overlap.
  - `TC04_SMALL_PN_CHAIN_GAP`: malformed OP chain catches PN conflict.
  - `TC05_SMALL_HOLIDAY_GUARD`: holiday skip should prevent holiday conflict.
- Medium
  - `TC06_MEDIUM_NOMINAL_50`: 50-piece stable run.
- Large
  - `TC07_LARGE_NOMINAL_250`: 250-piece stress run.
  - `TC08_LARGE_MULTI_BATCH_AVAILABILITY`: 2x449 pieces with availability restriction.

Manifest: `/Users/xoxo/Desktop/epsilonschedulingmain 2/scripts/testcases/piece_conflicts/manifest.json`

## Run Commands
```bash
cd "/Users/xoxo/Desktop/epsilonschedulingmain 2"
python3 scripts/piece_conflict_suite.py \
  --manifest scripts/testcases/piece_conflicts/manifest.json \
  --out-dir out/piece_conflict_suite
```

## Acceptance Criteria
- [ ] All 5 conflict classes are scanned every run.
- [ ] Small/medium/large suite executes end-to-end.
- [ ] For each testcase, expected conflict codes match actual codes.
- [ ] Failures include exact `part/batch/op` references for debugging.
