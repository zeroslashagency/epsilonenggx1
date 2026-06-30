# HandleMachines Capacity Plan (Mockup + Workflow + Architecture)

## Goal
Add operation-level person handling capacity using `HandleMachines`:
- `SINGLE MACHINE`: one person can handle only one machine at a time for that operation, and cannot overlap any other assignment.
- `DOUBLE MACHINE`: one person can handle two machines at the same time for that operation, and may overlap only with another `DOUBLE MACHINE` run.

This must work with piece-level scheduling, setup windows, shifts, holidays, and machine breakdowns.

## Current Gap (Observed)
- Import pipeline reads `EligibleMachines`, setup/cycle/min-batch, but does not wire `HandleMachines` into operation spec.
- Scheduler currently uses `personNextFree` (single timestamp), which serializes all person work and cannot model controlled overlap.

## Proposed Data Contract

### Input (operation row)
- `PartNumber`
- `OperationSeq`
- `OperationName`
- `SetupTime_Min`
- `CycleTime_Min`
- `Minimum_BatchSize`
- `EligibleMachines`
- `HandleMachines` (`SINGLE MACHINE` or `DOUBLE MACHINE`)

### Normalized operation model
- `handleMode: "single" | "double"`
- `runPersonUnitsRequired: number`
  - `single -> 2`
  - `double -> 1`

### Why units?
Use a person run capacity of `2` units:
- Single-machine op consumes `2` units (exclusive).
- Double-machine op consumes `1` unit (up to two overlaps).

This makes mixed overlap checks deterministic and simple.

## Person Capacity Rules

### Setup
- Setup always exclusive.
- A person cannot do setup while doing run.
- Setup overlap with setup/run is not allowed.

### Run
- Person has max run capacity `2`.
- Overlap allowed only when total overlapped units `<= 2`.
- `single` run uses `2` (blocks all other run overlaps).
- `double` run uses `1` (permits second concurrent `double` run only).
- overlap policy:
  - `double + double` is allowed (up to 2 concurrent runs for the same person)
  - `single + any` is not allowed
  - `setup + any run` is not allowed

## Scheduling Workflow (Operation Placement)

1. Build candidate machine list from `EligibleMachines`/`fixedMachine`.
2. Find setup slot (machine + setup person), respecting:
- setup window
- setup person shift
- holiday
- breakdown
3. Simulate piece run for candidate (`setupEnd -> runEnd`) with machine constraints.
4. Validate production person capacity on `[runStart, runEnd]`:
- setup conflicts
- run units overlap check
5. If person conflict:
- move candidate start to next feasible boundary
- re-simulate and re-check
6. Pick best candidate by:
- earliest `runEnd`
- then lower setup priority
- then stable machine tie-break
7. Commit reservations:
- machine interval reservation
- setup person setup reservation
- production person run reservation (with units)

## Required Engine Refactor

### Replace this
- `personNextFree: Map<string, Date>`

### With this
- `personCalendars: Map<string, PersonCalendar>`

PersonCalendar:
- `setupIntervals: Interval[]`
- `runIntervals: IntervalWithUnits[]`
- helper APIs:
  - `canReserveSetup(person, start, end): boolean`
  - `canReserveRun(person, start, end, unitsRequired): boolean`
  - `reserveSetup(...)`
  - `reserveRun(...)`
  - `nextFeasibleRunStart(...)`

## Import Pipeline Changes

In import normalization:
- Parse `HandleMachines` column aliases:
  - `HandleMachines`, `handle_machines`, `handle machine`, `handle mode`
- Normalize:
  - contains `double` => `"double"`
  - else => `"single"`
- Attach to `ImportedOperationDetail` and pass into scheduler via `operationDetails`.

Backward compatibility:
- If missing `HandleMachines`, default to `"single"` (safe behavior).

## Validation Checks to Add

1. `person_setup_overlap` (critical)
2. `person_setup_run_overlap` (critical)
3. `person_run_capacity_exceeded` (critical)
4. `person_single_mode_overlap` (critical)
5. `machine_overlap` (critical)
6. `machine_breakdown_conflict` (critical)
7. `holiday_conflict` (critical)
8. `piece_precedence_violation` (critical)
9. `batch_split_quality` (warn)
10. `handle_mode_parse_fallback` (warn)

## Text Mockup (What User Sees)

### Operation Detail (per row)
- `PN1001 | OP2 | Handle: DOUBLE MACHINE | Eligible: VMC 1,VMC 2,VMC 7,VMC 4`

### Verification Summary
- `person_run_capacity_exceeded: 0`
- `person_setup_run_overlap: 0`
- `machine_overlap: 0`
- `holiday_conflict: 0`

### Evidence line (if fail)
- `[Critical] person_run_capacity_exceeded: Sivakumar C overlap 23/02/2026, 10:00:00-12:00:00 used=3 max=2`
- `[Critical] person_single_mode_overlap: Rajesh has SINGLE MACHINE assignment overlapping another run`

## Test Matrix (Small -> Big)

1. TC-HM-01 small single
- 1 part, 1 op, handle single
- Expect: no person run overlap

2. TC-HM-02 small double
- 1 part, 2 batches, handle double
- Expect: one person can run 2 simultaneous machines

3. TC-HM-03 over-capacity
- force 3 concurrent double runs on one person
- Expect: `person_run_capacity_exceeded`

4. TC-HM-04 mixed modes
- one single + one double overlap same person
- Expect: blocked (2 + 1 > 2)

5. TC-HM-05 setup-vs-run clash
- setup assigned to running person interval
- Expect: `person_setup_run_overlap`

6. TC-HM-06 holiday gate
- run segment crossing holiday
- Expect: paused/shifted, no holiday conflict

7. TC-HM-07 breakdown gate
- eligible machine unavailable in window
- Expect: reschedule/select alternate machine

8. TC-HM-08 piece precedence
- OP2 starts before OP1 piece ready (forced)
- Expect: precedence fail detected

9. TC-HM-09 medium batch
- 50-200 qty with mixed single/double ops
- Expect: deterministic stable assignment, zero critical conflicts

10. TC-HM-10 large batch/perf
- 500+ qty, multi-part
- Expect: completes within target runtime and no capacity violations

## Performance Targets
- Small set (<50 rows): < 1s
- Medium set (50-500 rows): < 5s
- Large set (500+ rows, piece timeline): < 20s

## Implementation Phases

1. Import + schema
- add `handleMode` parsing and propagation
- verify parsed operation details include handle mode

2. Scheduler resource model
- add person interval capacity calendar
- remove reliance on single `personNextFree` gating

3. Placement algorithm
- enforce setup exclusivity + run unit capacity
- add re-attempt for person-capacity window shifts

4. Verifier + quality report
- add capacity-specific conflict checks + evidence

5. Regression + performance tests
- execute TC-HM-01..10 and record runtime + conflicts

## Done Criteria
- `HandleMachines` is parsed, scheduled, and validated end-to-end.
- `DOUBLE MACHINE` allows exactly 2 concurrent runs per person.
- `SINGLE MACHINE` remains exclusive.
- No regressions in machine/holiday/breakdown/piece precedence checks.
