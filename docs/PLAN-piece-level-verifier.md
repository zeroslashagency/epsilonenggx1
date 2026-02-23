# PLAN-piece-level-verifier

## Objective

Build a Python verifier that simulates piece-level scheduling and exports both machine-checkable validation outputs and a visual timeline (`piece_flow.html`).

## Scope

- Enforce sequence order, machine exclusivity, and machine eligibility.
- Apply setup window, operator shifts, holidays, and machine breakdown pauses.
- Emit operation-level summary and piece-level run trace.
- Generate validation report with hard failures and warnings.

## Deliverables

- `scripts/piece_level_verifier.py`
- `out/operation_summary.csv`
- `out/piece_timeline.csv`
- `out/validation_report.json`
- `out/piece_flow.html`

## Execution Steps

1. Parse input (`--input`) or use built-in demos (`--demo batch3|batch250`).
2. Normalize windows and calendars.
3. Schedule each operation with:
   - Earliest feasible setup slot.
   - Operator assignment inside shift boundaries.
   - Piece-by-piece flow propagation to next operation.
4. Validate constraints:
   - No machine overlap.
   - No operator overlap.
   - Monotonic run-end ordering by operation sequence.
5. Export CSV, JSON, and HTML outputs.

## Runbook

```bash
python scripts/piece_level_verifier.py --demo batch3 --out-dir out
python scripts/piece_level_verifier.py --demo batch250 --out-dir out
python scripts/piece_level_verifier.py --input data/schedule_input.json --out-dir out
```

## Notes

- Default visual lane mode is `machine`; use `--lane-mode operation` for process-flow lanes.
- The script is standalone and does not modify production scheduling APIs.
