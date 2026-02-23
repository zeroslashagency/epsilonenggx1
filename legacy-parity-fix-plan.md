# Legacy Parity Fix Plan

## Goal
Match the expected legacy-style output for `PN20001` and `PN4001`:
- few large balanced batches (not many tiny batches),
- deterministic machine path across OP1 -> OP2,
- global batch numbering across all orders,
- piece-level overlap across operations with realistic shift-gap pauses.

## Root-Cause Findings (Current Code)
- [ ] `auto-split` is using `minimumBatchSize` as target batch size, creating too many small batches.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:287`
- [ ] Batch IDs restart for each order (`B01` starts again on each part) instead of global sequence.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:89`
- [ ] Orders are scheduled serially by order loop, which blocks true cross-order parallel starts and drifts from legacy.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:70`
- [ ] Default global start uses "now" when not set, which makes runs non-reproducible and often outside expected 06:00 baseline.
  - Evidence: `app/(app)/scheduler/page.tsx:938`
- [ ] Shift inputs (`shift1/shift2/shift3`) are ignored for operator availability; all operators are forced to setup window.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:636`
- [ ] Machine choice logic prefers earliest finish + balancing, not legacy deterministic lane selection.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:404`
- [ ] Optional blank operator behavior is not modeled; scheduler always assigns an operator name.
  - Evidence: `app/lib/features/scheduling/deterministic-scheduling-engine.ts:367`

## Implementation Plan
1. Replace auto-split policy for parity mode.
   - Add `autoSplitStrategy: legacy-balanced`.
   - For `auto-split`, compute a small lane count (default 2 unless constrained) and split near-equal.
   - Expected for sample: `889 -> 444/445`, `898 -> 449/449`.

2. Introduce schedule-global batch ID allocator.
   - Move batch ID counter outside per-order loop.
   - Expected for sample: `PN20001 -> B01/B02`, `PN4001 -> B03/B04`.

3. Switch from strict per-order scheduling loop to event-driven queue.
   - Queue jobs by priority, due date, and earliest feasible start.
   - Allow cross-order starts on free machines while preserving per-batch OP sequence.

4. Add deterministic legacy machine path mode.
   - Use stable ranked machine candidates (before load balancing).
   - Preserve OP path consistency per batch when possible.

5. Model operator modes explicitly.
   - `pooled`: current behavior.
   - `allow_blank_person`: keep person empty when operation source has no person lock.
   - `strict_person_lock`: honor fixed person when provided.

6. Align start-time policy.
   - If no explicit global start, align to next setup window start (not current timestamp).
   - Keep deterministic baseline for reproducible comparisons.

7. Add parity diagnostics + diff tool.
   - Emit row diagnostics: `batch_strategy`, `pause_minutes`, `machine_rank`, `first_piece_arrival`.
   - Build a comparison report against expected table for machine/person/time delta.

## Verification Checklist (Must Pass)
- [ ] `PN20001` produces exactly 2 OP1 rows, on deterministic machines, with balanced batch qtys.
- [ ] `PN4001` produces exactly 2 batches with OP1 and OP2 rows and correct OP chain.
- [ ] Batch IDs are global and monotonic across parts.
- [ ] Piece-flow map reflects actual schedule lanes beyond only VMC 1/2 when schedule rows use them.
- [ ] Timing includes paused shift-gap details in legacy format.
- [ ] No setup-window critical violations for baseline `06:00-22:00` scenario.
