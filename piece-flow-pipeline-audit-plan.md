# Piece Flow Pipeline Audit Plan

## Goal
Find errors in the piece-level pipeline (`schedule -> piece rows -> Piece Flow Map`), validate behavior with batch tests, and move to a more accurate piece-level algorithm.

## Current Findings (Observed)
- [ ] Flow map is built from synthetic piece slices, not actual piece timestamps from scheduler.
  - Evidence: `buildPieceFlowRows` distributes each row uniformly from `runStart` to `runEnd`.
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx:181`
- [ ] Default piece filter hides most pieces (`1..20`), so users think lanes/machines are missing.
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx:360`
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx:616`
- [ ] Detail mode auto-switches to stacked mode for dense data, which hides per-piece links.
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx:1744`
- [ ] Scheduler computes piece completion times internally but does not return them, so UI cannot render true piece-level flow.
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/deterministic-scheduling-engine.ts:149`
- [ ] Time axis labels show only time-of-day, not date, which is misleading on multi-day schedules.
  - File: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx:1975`

## Pipeline Invariants To Validate
- [ ] Invariant A: `runStart(piece_i, op_k) >= runEnd(piece_i, op_k-1)` (piece dependency).
- [ ] Invariant B: `runStart(piece_i, op_k) >= runEnd(piece_i-1, op_k)` (machine serial order).
- [ ] Invariant C: Setup/run minutes do not overlap holidays/breakdowns.
- [ ] Invariant D: Every rendered link connects existing source/target nodes.
- [ ] Invariant E: Every scheduled operation row is represented in map data (no dropped lanes due to naming mismatch).

## Test Matrix (Different Batches + Edge Cases)
- [ ] T1 Small happy path: 1 batch, 2 ops, 3 pieces.
  - Verify: detail links connect OP1 -> OP2 per piece.
- [ ] T2 Medium batch: 1 batch, 2 ops, 50 pieces.
  - Verify: no piece-order violation, map remains readable.
- [ ] T3 Large batch: 1 batch, 4 ops, 250 pieces.
  - Verify: dense-mode warning shown; switch/filters still expose detail.
- [ ] T4 Split batches: 2 large balanced batches (e.g., `444/445`).
  - Verify: global batch IDs and per-batch links are correct.
- [ ] T5 Breakdown exclusion.
  - Verify: blocked machine not selected during blocked interval.
- [ ] T6 Setup pause across window.
  - Verify: setup spans across day boundary with paused minutes.
- [ ] T7 Holiday blocking.
  - Verify: no setup/run inside holiday interval.
- [ ] T8 Machine-name normalization (`vmc2`, `VMC2`, `VMC 2`).
  - Verify: all map nodes appear in correct lane.
- [ ] T9 Multi-day schedule.
  - Verify: x-axis includes date markers/day separators.
- [ ] T10 Piece filter behavior.
  - Verify: default filter cannot hide 95% of data silently.

## Algorithm Upgrade Plan
- [ ] Task 1: Return true piece event rows from scheduler engine.
  - Add `pieceTimeline` in schedule output (`part,batch,piece,op,machine,runStart,runEnd`).
  - Verify: UI uses returned piece rows directly; fallback to synthetic only if absent.
- [ ] Task 2: Replace synthetic piece slicing in UI with source-of-truth piece rows.
  - File target: `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx`
  - Verify: spot-check piece timestamps against engine output.
- [ ] Task 3: Improve map defaults for visibility.
  - Default piece range should auto-expand by selected part or show explicit “show all pieces”.
  - Verify: users can see all active lanes without manual tuning.
- [ ] Task 4: Keep detail mode available for filtered subsets.
  - Preserve forced stacked only when node count exceeds threshold after filter.
  - Verify: selecting one part + narrow piece range always enables detail links.
- [ ] Task 5: Add date-aware time axis.
  - Include date on tick labels when span > 24h.
  - Verify: multi-day schedules are readable.
- [ ] Task 6: Add schedule/map parity checker.
  - Script compares operation rows vs piece rows vs rendered node count.
  - Verify: report flags dropped nodes, bad links, lane mismatches.

## Evidence Collected In This Audit
- [x] Demo runs succeeded:
  - `python3 scripts/piece_level_verifier.py --demo batch3 --out-dir out/pipeline-audit-batch3`
  - `python3 scripts/piece_level_verifier.py --demo batch250 --out-dir out/pipeline-audit-batch250`
- [x] Breakdown case passed (`VMC 1` blocked, scheduler selected `VMC 2`):
  - `out/pipeline-audit-case-breakdown/operation_summary.csv`
- [x] Setup pause case passed (setup active 180 min, paused 1320 min across window):
  - `out/pipeline-audit-case-setup-pause/validation_report.json`
- [x] Piece dependency case passed (OP2 piece1 starts before OP1 batch complete, but after OP1 piece1):
  - `out/pipeline-audit-case-dependency/piece_timeline.csv`

## Done When
- [ ] Piece Flow Map is driven by true piece events (not synthetic interpolation).
- [ ] All 10 matrix tests pass with no invariant violations.
- [ ] User can inspect true OP1->OP2->OP3 movement per piece and per machine lane.
