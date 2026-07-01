# Production Scheduler PRD-500 Charter

Date: 2026-02-24

## Scope

This PRD-500 charter validates three linked areas end-to-end:

- Setup-first staffing for setup intervals.
- Production-first staffing for run intervals, with setup fallback only when production is infeasible.
- Export integrity for `Percent_Report` and `Setup_output` datetime visibility.

## Policy Contract

- `SETUP` assignment priority:
  - Primary: setup team.
  - Secondary: production team members explicitly eligible for setup.
- `RUN` assignment priority:
  - Primary: production team.
  - Secondary: setup team fallback only when no feasible production candidate exists.
- Report contract:
  - `Percent_Report` reflects actual scheduled assignments.
  - `Setup_output` always exports date+time (not date-only).

## CHK Grouping (500 Total)

- CHK-001..080 (80): Assignment policy unit checks.
- CHK-081..140 (60): Personnel import/parser normalization checks.
- CHK-141..210 (70): `Setup_output` datetime formatting and edge checks.
- CHK-211..290 (80): `Percent_Report` grid/content correctness checks.
- CHK-291..350 (60): Integration checks (import -> schedule -> workbook).
- CHK-351..400 (50): Golden workbook stability checks.
- CHK-401..450 (50): Regression bank checks.
- CHK-451..480 (30): Performance and determinism checks.
- CHK-481..500 (20): Governance and release-gate checks.

## Evidence Standard

Each CHK must provide:

- Deterministic command/harness invocation.
- PASS/FAIL status.
- Artifact path (log/json/snapshot/report).
- Failure taxonomy (`logic_error`, `format_error`, `nondeterminism`, `perf_regression`, `infra`).

## Acceptance Gates

- P0/P1 policy checks: 100% pass.
- Overall PRD-500 pass rate: >= 98%.
- Determinism groups (`CHK-351..400`, `CHK-451..480`) must produce stable hash/equivalent results on rerun.
- All failures must include reproducible evidence artifacts.

## Execution Workflow

1. Generate CHK manifest and initial scorecard.
2. Run grouped suites and update CHK statuses incrementally.
3. Emit markdown+json scorecards.
4. Publish release-gate decision from final counts and critical failures.

## Runner Profiles

Use `scripts/prd500_runner.py` with profile mode:

- `python3 scripts/prd500_runner.py --run-profile seeded`
- `python3 scripts/prd500_runner.py --run-profile phase2`
- `python3 scripts/prd500_runner.py --run-profile phase3`
- `python3 scripts/prd500_runner.py --run-profile phase2plus3`
- `python3 scripts/prd500_runner.py --run-profile phase4`
- `python3 scripts/prd500_runner.py --run-profile phase2plus3plus4`

Profile intent:

- `seeded`: minimal baseline mapping.
- `phase2`: expanded Jest-based coverage and integration evidence.
- `phase3`: golden/regression/performance/governance script evidence.
- `phase2plus3`: combined execution for maximum current auto-mapped coverage.
- `phase4`: auto-maps remaining pending ranges with expanded suite evidence.
- `phase2plus3plus4`: full combined coverage pass for all 500 CHKs.

## Existing Automated Coverage Mapped

- `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts`
- `app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts`
- `app/lib/features/scheduling/__tests__/personnel-v2.test.ts`
- `app/lib/features/scheduling/__tests__/import-input.integration.test.ts`
- `app/lib/features/scheduling/__tests__/excel-export.test.ts`

These suites are currently mapped as seeded evidence in the runner scaffold.
