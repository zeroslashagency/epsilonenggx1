# Piece Flow V2 Redesign Plan

## Goal
Make Piece Flow trustworthy and readable: exact timestamp alignment, cursor-level piece details, and step-by-step verification that reflects generated schedule data.

## Current Blocking Issues (Code-verified)
- Fallback synthetic piece generation still exists in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx` (`buildPieceFlowRows` fallback branch), which interpolates pieces evenly and can be visually wrong.
- Legacy engine path returns only operation rows (no `pieceTimeline`) in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/scheduling-engine-integration.ts`.
- X-axis labels are time-only (no date), which is misleading for multi-day schedules.
- `Stacked/Detail` and `Zoom` are UI-level only; they do not guide users to inspect one piece cleanly.
- Cursor line exists, but there is no nearest-node inspector card for exact `Part/Batch/Piece/Op/Machine/Person/Start/End` under cursor.

## Tasks
- [ ] Task 1: Enforce one source of truth for piece events.
  - Action: Require scheduler response contract `{ rows, pieceTimeline, setupTimeline? }` for both deterministic and legacy paths.
  - Verify: `pieceTimeline.length > 0` for generated schedules; UI shows "approximate" badge only if fallback used.

- [ ] Task 2: Add strict timeline normalization module.
  - Action: Create one parser/util for all schedule timestamps and durations; output epoch ms only for rendering/verification.
  - Verify: same start/end ms values are used by KPI, chart, and verification (no mismatched totals).

- [ ] Task 3: Redesign Piece Flow modes and controls.
  - Action: Replace `Stacked/Detail` with `Blocks | Piece Trace | Playback`; replace raw zoom with `Time Scale` (`1h`, `6h`, `24h`, `full`).
  - Verify: selecting `Piece Trace` never auto-switches mode; if dense, it auto-slices piece range and explains it.

- [ ] Task 4: Rebuild Piece Trace geometry for readability.
  - Action: In trace mode, use orthogonal/segmented links (not large bundled bezier curves), lane snap, and collision offsets per lane bucket.
  - Verify: for filtered range `1-20`, links do not merge into spaghetti and can be visually followed op-to-op.

- [ ] Task 5: Add cursor-driven inspector + click selection.
  - Action: On hover/move, resolve nearest active node at cursor time; render side inspector panel with full tuple and raw timestamps.
  - Verify: moving cursor updates inspector live; clicking locks selection and highlights path across operations.

- [ ] Task 6: Add "Verify One-by-One" event pipeline.
  - Action: Build event stream ordered by time (`setup_start`, `setup_end`, `run_start`, `run_end`, `handoff`) and run checks stepwise.
  - Verify: pressing `Run Verification` streams checks in order and logs exact event references for each issue.

- [ ] Task 7: Add issue navigator and jump-to-evidence.
  - Action: Right panel with `Summary | Issues | Evidence`; clicking an issue auto-filters part/batch/piece/op and centers timeline.
  - Verify: one click isolates the conflict and highlights offending intervals.

- [ ] Task 8: Integrate playback panel into timeline workflow.
  - Action: Keep `Delay (ms)`, `Step`, `Filtered-only scope`, plus `Step Event` and `Step Piece` controls.
  - Verify: playback advances deterministically by selected step unit and cursor label includes date + time.

- [ ] Task 9: Add performance guardrails.
  - Action: precompute lanes/scales, cull offscreen nodes, and throttle hover hit-tests.
  - Verify: 3,000+ piece events remain interactive (no freeze while scrubbing cursor).

- [ ] Task 10: Add regression tests (small to big).
  - Action: unit + UI tests for alignment, precedence, conflicts, and cursor inspector.
  - Verify: test suite catches current failure patterns before release.

## Test Matrix
- [ ] Small-1: 1 part, 1 batch, 2 ops, 10 pieces.
  - Expect: piece-by-piece links trace clearly; no overlap false positives.
- [ ] Small-2: 1 part, 2 batches, 3 ops, 20 pieces.
  - Expect: batch routing and piece precedence are correct.
- [ ] Medium-1: 2 parts, 5 ops total, 200-400 pieces.
  - Expect: mode remains readable; inspector resolves node under cursor.
- [ ] Large-1: 5+ parts, 2000+ pieces.
  - Expect: auto-slice + performance guards keep UI usable.
- [ ] Edge-1: machine breakdown interval.
  - Expect: no run/setup overlap with blocked interval.
- [ ] Edge-2: holiday + setup window constraints.
  - Expect: setup violations are flagged with exact windows.
- [ ] Edge-3: operator overlap strict mode.
  - Expect: conflicts appear with entity refs and time evidence.

## Done When
- [ ] Timeline alignment is exact against generated schedule timestamps (no synthetic mismatch in normal path).
- [ ] Cursor hover/click always shows specific piece details and full evidence.
- [ ] Verification runs one-by-one and issues are jumpable in the map.
- [ ] Users can inspect dense schedules via controlled slicing without losing trace mode.
