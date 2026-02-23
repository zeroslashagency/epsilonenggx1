# Piece Conflict Testcases

This suite is intentionally ordered from small to big batches.

## Conflict codes
- `MACHINE_CONFLICT`: overlap on same machine interval (`SetupStart -> RunEnd`).
- `PERSON_CONFLICT`: same operator overlap (setup only or setup+run based on case policy).
- `PN_CONFLICT`: non-contiguous/duplicate operation chain for same `PartNumber + Batch_ID`.
- `HOLIDAY_CONFLICT`: setup or run intersects holiday date.
- `MACHINE_AVAILABILITY_CONFLICT`: operation violates `machine_availability` rules.

## Cases
1. `TC01_SMALL_NOMINAL`: 6 pieces, 2 ops, expected clean.
2. `TC02_SMALL_MACHINE_AVAILABILITY_BLOCK`: 4 pieces, fixed machine blocked by availability rule.
3. `TC03_SMALL_PERSON_RUN_OVERLAP`: two small batches with one operator, run overlap expected.
4. `TC04_SMALL_PN_CHAIN_GAP`: malformed operation chain (OP1 then OP3).
5. `TC05_SMALL_HOLIDAY_GUARD`: holiday day should be skipped.
6. `TC06_MEDIUM_NOMINAL_50`: 50 pieces, 3 ops.
7. `TC07_LARGE_NOMINAL_250`: 250 pieces, 4 ops.
8. `TC08_LARGE_MULTI_BATCH_AVAILABILITY`: 2x449 pieces with machine availability restriction.

## Run
```bash
python3 scripts/piece_conflict_suite.py \
  --manifest scripts/testcases/piece_conflicts/manifest.json \
  --out-dir out/piece_conflict_suite
```

The suite writes per-case outputs:
- `operation_summary.csv`
- `piece_timeline.csv`
- `conflicts.csv`
- `report.json`

And summary:
- `out/piece_conflict_suite/suite_report.json`
