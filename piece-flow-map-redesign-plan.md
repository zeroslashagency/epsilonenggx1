# Piece Flow Map Redesign Plan

## Goal
Fix wrong schedule data generation and redesign the Piece Flow Map so piece movement across OP and VMC lanes is readable, detailed, and trustworthy.

## Tasks
- [x] Task 1: Remove mock-time schedule generation from the active run path in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/backend-integration.ts` and fail fast if real engine is unavailable.
  - Verify: schedule results no longer use `Date.now() + sequenceIndex * ...` timestamps.
- [x] Task 2: Add a deterministic piece-level scheduling backend path (TypeScript service or API route) that enforces setup window, production windows, shifts, holidays, and breakdown pauses.
  - Verify: for your PN26001 sample, `Setup Start` and `Setup End` always fall inside configured setup windows when active setup minutes are evaluated.
- [ ] Task 3: Extend schedule payload with diagnostics needed by UI (`setup_segments`, `piece_events`, `arrival_from_prev_op`, `wait_min`, `pause_reasons`).
  - Verify: each OP row can explain why timing moved (shift gap, holiday, breakdown, queue wait).
- [ ] Task 4: Update quality evaluator in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx` to validate setup by active setup segments, not only start/end timestamps.
  - Verify: false positives are removed for paused setup spans crossing non-working hours.
- [x] Task 5: Rebuild Piece Flow Map model in `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx` with density-aware rendering.
  - Verify: no unreadable label pile-up when piece count is high; nodes remain legible for 1,600+ pieces.
- [ ] Task 6: Implement 3 visualization modes:
  - `Sequence` mode: one node per piece per OP with clear OP-to-OP links (matches your sketch).
  - `Stacked` mode: compact clusters by OP per machine lane.
  - `Timeline` mode: time-scaled bars with zoom.
  - Verify: operator can switch modes without rerunning schedule.
- [ ] Task 7: Add interaction controls for debug depth (Part, Batch, OP range, piece range, machine set, time window, zoom).
  - Verify: selecting OP1-OP3 and VMC1-3 shows only those lanes and links.
- [ ] Task 8: Add map legend + status encoding (scheduled/running/completed, due-risk, setup-pause markers) and tooltips with exact timestamps.
  - Verify: hovering a node shows part, batch, piece, op, machine, setup/run timing, wait and pause reason.
- [ ] Task 9: Add regression tests:
  - data correctness tests for setup-window compliance;
  - map model tests for node/link counts and filtering;
  - UI smoke test for mode toggle + high-density dataset.
  - Verify: test suite catches the current screenshot failure pattern.

## Done When
- [ ] Quality panel no longer reports setup-window criticals caused by mock scheduling.
- [ ] Piece Flow Map is readable for high-volume runs and matches machine-lane + OP-flow intent in your sketch.
- [ ] Debug filters (Part/OP/VMC/Piece) isolate flows correctly and show trustworthy timestamps.
