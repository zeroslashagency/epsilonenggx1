# Production Scheduler Advanced Settings Verification Report

Date: 2026-02-24
Scope: Advanced Settings + piece-level pipeline complex validation

## 1) Implementation Changes Applied

- Added strict payload validation in `app/api/save-advanced-settings/route.ts` for:
  - window format (`HH:MM-HH:MM`)
  - holiday interval integrity (`end > start`)
  - breakdown interval integrity (`end > start`) and required machines
- Added draft save support (not only lock/unlock) in the same API route.
- Added missing `shift_3` persistence path in API and scheduler payload construction.
- Wired Advanced Settings UI buttons:
  - `Save Settings` now persists current settings via API.
  - `Load Settings` now reloads latest saved snapshot for the user.
- Fixed local datetime handling for `Now` in scheduler master clock field (timezone-safe `datetime-local` value).
- Added holiday and breakdown range guards on UI side (`end > start`).
- Updated date picker disable behavior to fully close/freeze interactive controls when locked.

## 2) Section Status (Advanced Settings)

- Global Start Date & Time (Master Clock): WORKING (now button + local format)
- Global Setup Window input: WORKING (validated on save)
- Shift windows (Shift 1/2/3 + Production Shift 1/2/3): WORKING (validated + persisted)
- Holiday Calendar add/delete: WORKING (range validated)
- Machine Breakdown add/delete: WORKING (machine + range validated)
- Lock/Unlock settings: WORKING (existing behavior retained)
- Save Settings button: WORKING (newly wired)
- Load Settings button: WORKING (newly wired)

## 3) Automated Verification Commands and Results

### TypeScript/Jest pipeline tests

- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts`
  - Result: PASS (9/9)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts`
  - Result: PASS (3/3)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts`
  - Result: PASS (8/8)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/import-input.integration.test.ts`
  - Result: PASS (1/1)
- `npx jest --runInBand app/lib/features/scheduling/__tests__/excel-export.test.ts`
  - Result: PASS (1/1)

### Complex piece-level Python verification

- `python3 scripts/piece_conflict_suite.py --manifest scripts/testcases/piece_conflicts/manifest.json --out-dir out/piece_conflict_suite_latest`
  - Result: PASS (8/8 suite cases)
- `python3 scripts/piece_level_verifier.py --demo batch250 --out-dir out/piece_level_batch250_latest`
  - Result: PASS (all output artifacts generated)
- `python3 scripts/chk121_250_runner.py`
  - Result: PASS (`{"total": 40, "pass": 40}`)

## 4) Known Non-Blocking Repository Baseline Issues

- `npm run -s type-check` currently fails on pre-existing auth/settings test typing issues outside scheduler scope.
- These are not introduced by this change set.

