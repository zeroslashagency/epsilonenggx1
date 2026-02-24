# Production Scheduler Multiagent Pack (4 Additional Subagents)

Date: 2026-02-23
Scope: follow-up execution assets after initial PRD/preflight

## Subagent Outputs Included

- Subagent 1: execution-ready definitions for CHK-001..CHK-050 (import contract).
- Subagent 2: execution-ready definitions for CHK-051..CHK-100 (personnel parsing and scheduler/person assignment integration).
- Subagent 3: runnable case pack for CHK-101..CHK-200 (scheduler constraints + piece flow) plus fixture set.
- Subagent 4: phased execution model for CHK-201..CHK-500 (negative paths, taxonomy parity, perf/stability, reporting, CI gates).

## New Artifacts Produced

- `reports/chk-101-200-execution-case-pack.md`
- `tests/fixtures/chk_101_200/chk102_machine_fallback_eligible.json`
- `tests/fixtures/chk_101_200/chk106_run_pause_window.json`
- `tests/fixtures/chk_101_200/chk109_due_miss.json`
- `tests/fixtures/chk_101_200/chk110_due_hit.json`
- `tests/fixtures/chk_101_200/chk121_breakdown_mid_run.json`
- `tests/fixtures/chk_101_200/chk125_overnight_setup_window.json`
- `tests/fixtures/chk_101_200/chk126_overnight_production_window.json`
- `tests/fixtures/chk_101_200/chk151_piece_count_precedence.json`
- `tests/fixtures/chk_101_200/chk193_multi_batch_shared_machine.json`

## Quick Validation Performed

The following representative cases were executed successfully against the new fixture pack:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk102_machine_fallback_eligible.json --out-dir out/chk101_200/case02
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk151_piece_count_precedence.json --out-dir out/chk101_200/case18a
```

Observed result:

- Case02 assertion passed (`Machine == VMC 2`).
- Case18a assertion passed (`piece_timeline.csv` rows = 6).

## Execution Plan (Now)

### Wave 1 (Critical, immediate)

- Run CHK-001..CHK-050 by implementing import parser extraction test harness from scheduler page logic.
- Run CHK-051..CHK-100 with parser-centric Jest suite (13 grouped runnable cases).
- Run CHK-101..CHK-200 using `reports/chk-101-200-execution-case-pack.md`.

### Wave 2 (Risk & Release)

- Run CHK-201..CHK-300 negative path and taxonomy parity phases.
- Run CHK-351..CHK-400 perf/stability loops and deterministic rerun checks.
- Run CHK-401..CHK-500 reporting completeness and CI/release gate checks.

## Recommended Command Set for Next Step

```bash
npx jest app/lib/features/scheduling/__tests__/import-input.integration.test.ts --runInBand
npx jest app/lib/features/scheduling/__tests__/personnel-v2.test.ts --runInBand
npx jest app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts --runInBand
npx jest app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts --runInBand
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk102_machine_fallback_eligible.json --out-dir out/chk101_200/case02
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk151_piece_count_precedence.json --out-dir out/chk101_200/case18a
python3 scripts/piece_conflict_suite.py --out-dir out/chk-parity-wave
```

## Notes

- CHK-001..CHK-050 is mostly UI-coupled today; converting import logic into an exported parser module will make these checks fully automatable in Jest.
- CHK-067/CHK-068 may require policy clarification and/or engine behavior tightening for setup-only vs production-only assignment constraints.
