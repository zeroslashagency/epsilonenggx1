# Production Scheduler Profile Isolation PRD (1000 Checks)

Date: 2026-02-25
Scope: Advanced (setup + run) and Basic (run-only) profile isolation, API enforcement, Excel output contract, and CI gating.

## 1) Product Contract

- Advanced profile: user can configure setup windows/personnel and run schedule.
- Basic profile: user can run schedule only; no setup configuration and no setup output in exports.
- Backend is source of truth for run authorization (`schedule.run.basic`, `schedule.run.advanced`).
- UI must not expose runnable actions for unauthorized profile modes.

## 2) Functional Requirements

- Add API access checker at `app/api/schedule/run-access/route.ts`.
- Enforce run authorization before scheduler execution in `app/(app)/scheduler/page.tsx`.
- Add permission-code mapping updates in `app/lib/features/auth/permission-mapping.ts` and `app/lib/contexts/auth-context.tsx`.
- Add DB migration for run-profile permissions in `supabase/migrations/20260225_add_schedule_run_profile_permissions.sql`.
- Remove user-email override trust in advanced settings API (`app/api/save-advanced-settings/route.ts`).

## 3) Non-Functional Requirements

- Backward-compatible fallback for run permission checks during migration window.
- Deterministic tests for route auth matrix and Excel profile contract.
- No regression to existing scheduling/profile exports.

## 4) 1000-Check Verification Matrix

Each suite contains exactly 100 checks with IDs for traceability.

- Suite A (`A-001`..`A-100`): AuthN/AuthZ request guards and token behavior.
- Suite B (`B-001`..`B-100`): RBAC role-permission mapping and migration integrity.
- Suite C (`C-001`..`C-100`): Basic profile run-only behavior and denial paths.
- Suite D (`D-001`..`D-100`): Advanced profile setup+run behavior and denial paths.
- Suite E (`E-001`..`E-100`): Scheduler UI state gating and hidden/disabled controls.
- Suite F (`F-001`..`F-100`): Schedule execution parity and deterministic engine outputs.
- Suite G (`G-001`..`G-100`): Excel export sheet presence/absence by mode.
- Suite H (`H-001`..`H-100`): Excel column order/types/date formats and compatibility.
- Suite I (`I-001`..`I-100`): Security abuse checks (header spoofing, invalid mode, payload tamper).
- Suite J (`J-001`..`J-100`): CI pipeline gates, repeatability, and build readiness.

Total checks: 1000

## 5) Evidence Requirements

- Each check must record: ID, command/test, expected, actual, status, artifact path.
- Status taxonomy: `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`.
- All failed checks require owner and remediation note.

## 6) Exit Criteria

- 100% execution of the 1000-check matrix.
- Zero open `FAIL` in critical suites A/B/C/D/G/I.
- CI green for lint, type-check, tests, and build.
