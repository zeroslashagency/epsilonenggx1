# PRD Verification Checklist: HandleMachines (SINGLE vs DOUBLE)

## Feature Objective
Implement and verify operation-level person capacity behavior:
- `SINGLE MACHINE`: person cannot overlap with any other task in run window.
- `DOUBLE MACHINE`: person can overlap up to 2 concurrent run tasks only when both are `DOUBLE MACHINE`.
- Setup remains exclusive (no setup/setup overlap and no setup/run overlap).

## Execution Protocol
- Write test case
- Run scheduler/verifier
- Capture pass/fail + evidence
- Fix if fail

## Test Tasks (10+)

| ID | Scenario | Expected Result | Scope | Status |
|---|---|---|---|---|
| HM-01 | Import row with `HandleMachines = SINGLE MACHINE` | operation detail normalized to `handleMode=single` | Import | Pass |
| HM-02 | Import row with `HandleMachines = DOUBLE MACHINE` | operation detail normalized to `handleMode=double` | Import | Pass |
| HM-03 | Missing `HandleMachines` | default `handleMode=single` | Import | Pass |
| HM-04 | Single run + overlapping run (same person) | blocked / conflict (`person_single_mode_overlap` or capacity exceeded) | Engine | Pass |
| HM-05 | Double run + overlapping double run (same person) | allowed up to two concurrent runs | Engine | Pass |
| HM-06 | Double run + third overlapping run (same person) | conflict (`person_run_capacity_exceeded`) | Engine | Pass |
| HM-07 | Single run + overlapping double run (same person) | conflict | Engine | Pass |
| HM-08 | Setup overlap with setup (same person) | blocked by reservation model (no overlap permitted) | Engine | Pass |
| HM-09 | Setup overlap with run (same person) | blocked by reservation model (setup cannot overlap run) | Engine | Pass |
| HM-10 | Multi-machine routing with machine breakdown | no invalid assignment to blocked machine | Engine+Verifier | Pass |
| HM-11 | Holiday-crossing schedule | no setup/run in holiday window | Engine+Verifier | Pass |
| HM-12 | Regression: existing personnel-v2 tests | all existing tests pass | Regression | Pass |

## Evidence Mapping (Automated)
- HM-01, HM-02: `app/lib/features/scheduling/__tests__/import-input.integration.test.ts` (`['single','double']` handle mode propagation assertion).
- HM-03: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`defaults missing handle mode to single`).
- HM-04: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`blocks overlap for single-machine runs on the same production person`).
- HM-05: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`allows overlap for double-machine runs on the same production person`).
- HM-06: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`caps triple-double overlap to max two concurrent runs per person`).
- HM-07: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`treats mixed single+double overlap as blocked`).
- HM-08: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`keeps setup intervals non-overlapping for same setup person`).
- HM-09: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`prevents setup-run overlap for same person`).
- HM-10: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`avoids assigning blocked machine during active breakdown`).
- HM-11: `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`respects holiday blocking for setup and run`).
- HM-12: `app/lib/features/scheduling/__tests__/personnel-v2.test.ts`, `app/lib/features/scheduling/__tests__/excel-export.test.ts`, `app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts`, `app/lib/features/scheduling/__tests__/import-input.integration.test.ts`.

## Acceptance Criteria
- All HM-01..HM-12 marked `Pass`.
- No regression in scheduling export/tests.
- Conflict messages include person + time window + references.
