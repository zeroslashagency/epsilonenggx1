# Legacy Output Alignment Plan

## Goal
Match the legacy scheduling behavior (your ~75% correct model output) and provide accurate live piece movement for OP/VMC flows.

## Findings To Fix
- [x] Fixed machine assignments are not strictly enforced when `eligible_machines` is also present.
- [x] Setup cannot pause across unavailable windows, which breaks long-setup scenarios.
- [ ] Input schema does not support legacy columns (`Order_Quantity`, `Priority`, `Person`, per-operation setup/run timestamps, status tags).
- [ ] Scheduling order is not priority-aware (`urgent` vs `normal`), it relies only on input order.
- [ ] Holidays are date-only; legacy output needs period/range support.

## Implementation Tasks
- [x] Task 1: Add `machine_mode` (`fixed` vs `optimize`) and default to `fixed` when `machine` is present.
  - Verify: test case with `machine="VMC 2"` and `eligible=[VMC1,VMC2]` still schedules on VMC 2.
- [x] Task 2: Replace setup slot finder with pausable setup accumulation across windows.
  - Verify: 180-min setup with 2-hour setup window completes across multiple windows instead of crashing.
- [ ] Task 3: Add legacy TSV/CSV loader mapped from your old columns to internal objects.
  - Verify: parser accepts rows with your exact header set and produces deterministic schedule objects.
- [ ] Task 4: Add optional strict `Person`/`Operator` lock mode.
  - Verify: if row says `Person=A`, setup is assigned only to A; violations are flagged.
- [ ] Task 5: Add priority queueing for batches (`urgent` before `normal`, then due date, then start time).
  - Verify: mixed-priority input schedules urgent batches first unless blocked by machine occupancy.
- [ ] Task 6: Add holiday period support (`start/end` ranges) and machine availability reason tags.
  - Verify: output contains explicit pause reasons and `Machine_Availability_STATUS` details.
- [ ] Task 7: Build legacy-vs-new diff report.
  - Verify: report lists per-row deltas for SetupStart/End, RunStart/End, Machine, Operator, and timing drift.

## Verification Pack
- [ ] Unit tests for machine lock, setup pause, priority ordering, and legacy parsing.
  - Status: machine lock + setup pause tests added; full `pytest` run pending environment install.
- [ ] Integration test on a PN7001/PN1001 sample dataset.
- [ ] Manual live replay check filtered by `--live-operations 1,2,3 --live-machines "VMC 1,VMC 2,VMC 3".

## Done When
- [ ] New output matches legacy baseline within agreed tolerance.
- [ ] All hard failures are removed from diff report.
- [ ] Live replay and flow map show correct OP/VMC transitions for the filtered part.
