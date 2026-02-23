# Piece Flow Map + Verification Checks Redesign Plan

## Goal
After `Schedule Generate`, clicking `Piece Flow Verification Checks` should:
- show clear **piece-by-piece flow** (not dense unreadable stack only)
- provide **visual playback** of machine assignment and timeline movement
- run strict **verification checks** with pass/fail + evidence
- expose settings like `Delay (ms)` and check toggles

## Why current UI feels wrong
- Dense schedules auto-switch to stacked mode and hide detail.
- Labels like `P1-374` are too compressed for real diagnosis.
- Verification logic is not visible as a first-class workflow.
- No playback controls for “what happened next” understanding.

## Target UX (new flow)
1. User runs schedule.
2. User clicks `Piece Flow Verification Checks`.
3. Open a full-width panel with 3 tabs:
   - `Overview`
   - `Piece Trace`
   - `Verification`
4. User configures filters/settings.
5. Click `Run Verification`.
6. Show score + issues list + highlight bad links directly on map.
7. Optional `Play` animation with configurable `Delay (ms)`.

## UI redesign structure
- Top toolbar:
  - `Part`, `Batch`, `Operation`, `Piece From`, `Piece To`
  - `Mode`: `Overview` | `Piece-by-Piece` | `Playback`
  - `Delay (ms)` input
  - `Run Verification` button
  - `Export Checks` button
- Left: lane map (`VMC 1..10`)
- Right: verification summary panel
  - status chips: `PASS`, `WARN`, `FAIL`
  - counts by check
  - clickable issue rows (jump to offending piece/link)
- Bottom playback controls:
  - `Play/Pause`, `Step`, `Reset`, `Speed`, `Auto-center`

## Must-have verification checks
- `machine_overlap`
- `failed_operations`
- `fixed_validated_status`
- `reschedule_volume`
- `validation_failures`
- `shift_overlap`
- `setup_window_violation`
- `breakdown_conflict`
- `holiday_conflict`
- `piece_precedence_violation`
- `machine_serial_violation`
- `operator_setup_overlap`
- `operator_run_overlap` (strict mode toggle)
- `batch_split_quality`

## Settings model
- `Delay (ms)`: default `150`, range `0..2000`
- `Verification mode`:
  - `setup_only`
  - `setup_and_run_strict`
- `Density mode`:
  - `auto`
  - `force_detail`
  - `force_stacked`
- `Highlight`:
  - `critical only`
  - `all issues`
- `Batch split threshold %` for quality check

## Implementation tasks
- [ ] Task 1: Extract flow rendering into dedicated components
  - Create:
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/components/scheduling/PieceFlowToolbar.tsx`
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/components/scheduling/PieceFlowCanvas.tsx`
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/components/scheduling/PieceFlowVerificationPanel.tsx`
  - Verify: scheduler page no longer holds all map UI inline.

- [ ] Task 2: Add verification engine module
  - Create:
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/piece-flow-verification.ts`
  - Inputs: `results`, `pieceTimeline`, `settings`, `qualityReport`
  - Output: normalized issues + summary metrics.
  - Verify: deterministic output for same input.

- [ ] Task 3: Add playback event pipeline
  - Derive event stream from `pieceTimeline` (start/end per piece/op/machine).
  - Add animation controller with delay and stepping.
  - Verify: event cursor aligns with displayed node highlights.

- [ ] Task 4: Improve piece-by-piece visibility
  - Force detail mode for filtered small ranges (e.g., 1-20 pieces).
  - Add edge bundling off in piece mode.
  - Add tooltip with full tuple: `PN | Batch | Piece | OP | Machine | Start -> End`.
  - Verify: piece links are readable without overlap confusion.

- [ ] Task 5: Add verification drawer + jump-to-issue
  - Clicking an issue focuses corresponding lane/time/piece.
  - Verify: each issue row has direct visual context.

- [ ] Task 6: Add export of verification
  - CSV/JSON with issue details and counts.
  - Verify: downloadable report includes all check codes.

- [ ] Task 7: Add tests (small -> big)
  - Unit tests:
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/__tests__/piece-flow-verification.test.ts`
  - UI tests:
    - `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/components/scheduling/__tests__/piece-flow-panel.test.tsx`
  - Scenarios:
    - small (10-20 pieces), medium (100-200), large (300+)
  - Verify: no regressions in performance and check outputs.

## Performance guardrails
- Virtualize node rendering for high density.
- Use `requestAnimationFrame` for playback updates.
- Debounce filter changes (`150ms`).
- Precompute lane/time scales once per dataset.

## Acceptance criteria
- [ ] User can inspect **piece-by-piece** without auto-forced unreadable mode.
- [ ] Verification checks run on demand and show pass/fail with evidence.
- [ ] `Delay (ms)` playback works and is controllable.
- [ ] Issue click focuses exact problematic piece/operation.
- [ ] Large schedules remain responsive.

## Recommended implementation order
1. Verification engine module
2. UI split into toolbar/canvas/panel
3. Playback controls
4. Issue-focus interactions
5. Test suite and tuning
