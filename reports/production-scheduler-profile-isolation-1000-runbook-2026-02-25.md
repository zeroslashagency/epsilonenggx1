# Production Scheduler Isolation 1000-Check Runbook

Date: 2026-02-25
Scope: Suites A-J (A-001..J-100)
Execution mode: Parallel shard run with hard gates on critical suites

## Phase Plan

| Phase | Goal                                                                   | Duration | Output                |
| ----- | ---------------------------------------------------------------------- | -------: | --------------------- |
| 0     | Build/check final manifest (A-J IDs, owners, commands, artifact paths) |   30-45m | `scorecard.seed.json` |
| 1     | Fast preflight (`lint`, `type-check`, focused scheduler gates)         |   20-30m | preflight PASS/FAIL   |
| 2     | Critical suites first (A/B/C/D/G/I) in parallel                        |  90-120m | blocking results      |
| 3     | Remaining suites (E/F/H/J) in parallel                                 |  90-120m | completion results    |
| 4     | One controlled rerun for failures, classify flaky/partial/blocked      |   45-90m | final classification  |
| 5     | Aggregate final report + GO/NO-GO decision                             |   30-45m | md + json reports     |

## Suite Run Table

| Suite                        | Owner      | Priority | Primary Commands                                                                                                                                                                                    | Artifact Root                                     | Pass Criteria                                    |
| ---------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| A AuthN/AuthZ                | Subagent-1 | Critical | `npx jest --runInBand app/lib/features/auth/__tests__/auth-middleware-rbac-matrix.test.ts app/api/schedule/run-access/__tests__/route.test.ts app/lib/features/auth/__tests__/schemas.test.ts`      | `reports/artifacts/profile-isolation/<run-id>/A/` | 100 checks executed, 0 FAIL in A                 |
| B RBAC/Migrations            | Subagent-2 | Critical | `npm run test:scheduler:profile-isolation`; `npx jest --runInBand app/api/admin/__tests__/permission-guard-matrix.test.ts`; `RBAC_HEALTHCHECK_URL=... RBAC_HEALTHCHECK_TOKEN=... npm run rbac:gate` | `reports/artifacts/profile-isolation/<run-id>/B/` | 100 checks executed, 0 FAIL in B                 |
| C Basic Isolation            | Subagent-3 | Critical | `npm run test:scheduler:profile-isolation`; API probes against `/api/schedule/run-access` basic paths                                                                                               | `reports/artifacts/profile-isolation/<run-id>/C/` | 100 checks executed, 0 FAIL in C                 |
| D Advanced Isolation         | Subagent-4 | Critical | `npm run test:scheduler:profile-isolation`; API probes for advanced allow/deny; save-settings auth checks                                                                                           | `reports/artifacts/profile-isolation/<run-id>/D/` | 100 checks executed, 0 FAIL in D                 |
| E UI Gating                  | Subagent-5 | High     | `npx jest --runInBand "app/(app)/scheduler/__tests__/ui-gating-*.test.tsx"` (add tests per E matrix)                                                                                                | `reports/artifacts/profile-isolation/<run-id>/E/` | 100 checks executed, no P0 FAIL                  |
| F Determinism/Parity         | Subagent-6 | High     | `npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts`; replay tests per F matrix   | `reports/artifacts/profile-isolation/<run-id>/F/` | 100 checks executed, deterministic reruns stable |
| G Excel Sheet Contract       | Subagent-7 | Critical | `npm run test:scheduler:excel-contract`; contract assertions in `excel-export.test.ts`                                                                                                              | `reports/artifacts/profile-isolation/<run-id>/G/` | 100 checks executed, 0 FAIL in G                 |
| H Excel Format Compatibility | Subagent-7 | High     | `npm run test:scheduler:excel-contract`; extended schema/type/date checks                                                                                                                           | `reports/artifacts/profile-isolation/<run-id>/H/` | 100 checks executed, no P0 FAIL                  |
| I Abuse/Security             | Subagent-8 | Critical | API abuse probes (`curl`) for spoof/tamper/escalation + injection assertions in export tests                                                                                                        | `reports/artifacts/profile-isolation/<run-id>/I/` | 100 checks executed, 0 FAIL in I                 |
| J CI/Reliability             | Subagent-9 | High     | CI workflow validation + repeated gate runs (`test:scheduler:*`) + artifact checks                                                                                                                  | `reports/artifacts/profile-isolation/<run-id>/J/` | 100 checks executed, no P0 FAIL                  |

## Mandatory Gate Order

1. Preflight must pass before full run starts:
   - `npm run test:scheduler:profile-isolation`
   - `npm run test:scheduler:excel-contract`
2. Critical suites (A/B/C/D/G/I) determine immediate NO-GO on any FAIL.
3. Non-critical suites (E/F/H/J) still required for completion and scorecard closure.

## Artifact Conventions

- Log files: `reports/artifacts/profile-isolation/<run-id>/<suite>/logs/`
- Raw results: `reports/artifacts/profile-isolation/<run-id>/<suite>/results.json`
- Workbook samples: `reports/artifacts/profile-isolation/<run-id>/G/xlsx/` and `.../H/xlsx/`
- Final reports:
  - `reports/production-scheduler-profile-isolation-verification-YYYY-MM-DD.md`
  - `reports/production-scheduler-profile-isolation-scorecard-YYYY-MM-DD.json`

## Final Decision Rule

- GO only when:
  - All 1000 checks executed
  - Critical suites A/B/C/D/G/I have zero FAIL
  - No unresolved P0 failures in E/F/H/J
- Otherwise NO-GO with remediation owners per failed check.
