# Piece Flow "Render All Pieces" Plan

## Goal
Add an explicit, user-controlled mode to render all piece-level rows (no forced 1-20 slice), with loading/progress controls and safe performance behavior, while supporting both scheduler profiles (`basic` and `advanced`).

## Current Behavior (Observed)
- Trace view always uses `pieceRange` filtering and defaults to `1..20`.
- UI warns: "Too dense to render every piece clearly... Showing selected piece slice..."
- There is no explicit "Render All" action with progress and cancel.
- Dense datasets can become unreadable without guided rendering policy.

## Affected Files
- `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/(app)/scheduler/page.tsx`
- `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/piece-flow-helpers.ts`
- `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/__tests__/piece-flow-render-all.test.ts` (new)
- `/Users/xoxo/Desktop/epsilonschedulingmain 2/app/lib/features/scheduling/__tests__/piece-flow-helpers.test.ts` (extend)

## Design Decisions
- Keep current `Auto` behavior as default (safe).
- Add explicit `Render All` mode that user must click.
- In `Render All`, use chunked build (progressive render) to avoid UI freeze.
- Preserve all existing filters (part/batch/op/machine/person/time window) before "all pieces" expansion.
- Support both profiles:
  - `basic`: run-person-focused tooltips/logs
  - `advanced`: setup + run-person details

## UI Changes
1. Add Render Policy control near Piece controls:
   - `Auto`
   - `Slice`
   - `All (Progressive)`
2. Add button: `Render All Pieces`
   - Shows count (example: `Render All (7,619)`).
3. Add progress bar/status while building:
   - `Preparing...`
   - `Rendering 2,400 / 7,619`
   - `Done`
4. Add `Cancel` button during render.
5. Replace current dense warning with actionable state:
   - In Auto/Slice: existing message remains.
   - In All mode: show progress + performance hint.

## Engine/UI Flow Changes
1. Keep `pieceFlowRows` as source dataset.
2. Apply filters first (part/batch/op/machine/person/time).
3. Apply piece-selection policy:
   - Auto/Slice: use `pieceRange`.
   - All: bypass `pieceRange` and pass all filtered rows.
4. Build `flowMapModel` progressively in chunks:
   - batch size default: 500 rows/tick.
   - schedule via `requestIdleCallback` fallback to `setTimeout`.
5. Emit progress to UI state.
6. Allow cancel token to stop building.
7. On completion, replace temporary nodes/links with full model.

## Data/State Additions (Scheduler Page)
- `renderPolicy: 'auto' | 'slice' | 'all'`
- `isRenderAllActive: boolean`
- `renderProgress: { total: number; processed: number; phase: 'idle'|'prepare'|'render'|'done'|'cancelled'|'error' }`
- `renderSessionId`/cancel token (ref)

## Profile Compatibility Rules
- `basic` profile:
  - No setup columns in main table/logs.
  - Piece tooltip shows run person only.
- `advanced` profile:
  - Keep setup/run details.
  - Person timeline can include setup and run segments.
- Render policy behavior identical in both profiles.

## Verification Matrix (12 Tasks)
- [ ] PF-01: Auto mode keeps current slice behavior (`1..20`) and warning text.
  - Verify: with dense input, trace mode stays responsive and warning shown.
- [ ] PF-02: Slice mode respects `pieceRange` exactly.
  - Verify: `from/to` updates visible nodes count.
- [ ] PF-03: All mode ignores `pieceRange` and renders full filtered set.
  - Verify: nodes count equals filtered rows count.
- [ ] PF-04: Render All button starts progressive rendering with visible progress.
  - Verify: progress increments until done.
- [ ] PF-05: Cancel stops current rendering safely.
  - Verify: no crash, state goes `cancelled`, UI remains interactive.
- [ ] PF-06: Playback cursor still works during/after full render.
  - Verify: play/pause/reset acts on rendered data.
- [ ] PF-07: Run Verification works with full rendered dataset.
  - Verify: `filtered-only` and `all` scopes produce expected totals.
- [ ] PF-08: Basic profile support.
  - Verify: full render works; no setup-only fields required.
- [ ] PF-09: Advanced profile support.
  - Verify: full render works with setup + run person lanes/tooltips.
- [ ] PF-10: Focus from log row to map still works in All mode.
  - Verify: selected key scroll/highlight behavior preserved.
- [ ] PF-11: Export unaffected.
  - Verify: Excel export outputs unchanged schema/content.
- [ ] PF-12: Performance guardrails.
  - Verify: 7k+ piece rows complete render without blocking UI; cancel responds quickly.

## Performance Targets
- <= 2,000 rows: initial display under 500ms
- ~7,000 rows: progressive complete under 3-6s (machine dependent)
- UI thread remains interactive during build

## Risks + Mitigations
- Risk: SVG with very high links still heavy.
  - Mitigation: chunk build + optional simplified link rendering threshold.
- Risk: memory spikes on very large all-mode runs.
  - Mitigation: cap + warning + confirm dialog above threshold (example >25k nodes).
- Risk: stale render after filter change.
  - Mitigation: cancel previous session and restart with new session id.

## Implementation Order
1. Render policy state + controls.
2. Filter pipeline split (`slice` vs `all`).
3. Progressive model builder + progress/cancel.
4. Trace/links integration.
5. Profile-specific tooltip/log safeguards.
6. Tests + performance validation.

## Done When
- User can click `Render All Pieces` and see full filtered piece dataset rendered with progress.
- No forced fallback to `1..20` when All mode is active.
- Works in both `basic` and `advanced` profiles.
- Verification and export remain correct.
