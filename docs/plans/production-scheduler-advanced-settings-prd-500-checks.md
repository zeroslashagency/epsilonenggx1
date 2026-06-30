# Production Scheduler Advanced Settings + Piece-Level Pipeline PRD

Date: 2026-02-23  
Owner: Scheduling QA/Verification  
Target: Make every Advanced Settings section production-ready, with 120 runnable cases and 500 atomic checks.

## 1) Objective

Deliver a full execution plan to make each Advanced Settings section work end-to-end in the Production Scheduler, and validate downstream impact on deterministic scheduling and piece-level pipeline integrity.

## 2) Product Sections to Make Working

- Global Advanced Settings
- Master Clock (`Global Start Date & Time`)
- Global Setup Window (`HH:MM-HH:MM`)
- Shift 1 / Shift 2 (controls setup window)
- Production Window Shift 1 / Shift 2 / Shift 3
- Holiday Calendar (global pause intervals)
- Machine Breakdowns (machine-specific downtime intervals)
- Lock/Unlock persistence flow
- Save/Load Settings controls
- Piece-level scheduling/verifier pipeline

## 3) Current Gaps Found in Code (Baseline Audit)

- `Save Settings` and `Load Settings` buttons are rendered but not wired to handlers in `app/(app)/scheduler/page.tsx`.
- No strict client-side validation that `endDateTime > startDateTime` for holiday or breakdown creation.
- Holiday date normalization uses `toISOString().split('T')[0]`, which can shift day boundaries by timezone.
- `DateTimePicker` labels times as optional, but Holiday/Breakdown creation currently requires both start and end times.
- Lock payload persists `shift_1` and `shift_2` but misses `shift_3`, while runtime settings include `shift3`.
- `HolidayCalendar` passes `disabled` to input/button, but date picker interaction remains partially available if not gated consistently.

## 4) Architecture Under Test

- Advanced settings UI: `app/(app)/scheduler/page.tsx`
- Holiday section component: `app/components/holiday-calendar.tsx`
- Date/time range control: `app/components/date-time-picker.tsx`
- Advanced settings API: `app/api/save-advanced-settings/route.ts`
- Scheduling engine: `app/lib/features/scheduling/deterministic-scheduling-engine.ts`
- Engine integration: `app/lib/features/scheduling/scheduling-engine-integration.ts`
- Piece verifier: `app/lib/features/scheduling/piece-flow-verifier.ts`
- Python parity verifier: `scripts/piece_level_verifier.py`

## 5) Execution Plan (Section-by-Section)

### Phase 1 - Contract Freeze (API + UI schema)

- Define final payload contract for all advanced settings fields.
- Add explicit validation schema for setup windows, shift windows, holiday intervals, breakdown intervals.
- Add backward-compatible parsing for legacy saved payloads.

### Phase 2 - Global Settings Section

- Implement deterministic `Now` behavior using local timezone-safe datetime formatting.
- Auto-derive setup window from Shift 1 + Shift 2 with manual override guard.
- Enforce `HH:MM-HH:MM` parser with actionable inline errors.

### Phase 3 - Holiday Calendar Section

- Enforce valid range and non-zero interval duration.
- Block overlaps if business rule requires merge/reject behavior.
- Ensure disabled/locked mode freezes all controls (including date picker panel).

### Phase 4 - Machine Breakdowns Section

- Enforce machine selection required.
- Enforce valid date-time range and non-zero duration.
- Add collision policy for overlapping breakdown periods per machine.

### Phase 5 - Lock/Save/Load Persistence

- Wire `Save Settings` to draft save API route.
- Wire `Load Settings` to pull latest user-scoped snapshot.
- Preserve `shift_3` and all production windows in payload.
- Keep lock/unlock immutable behavior with audit timestamps.

### Phase 6 - Scheduler Integration

- Validate settings before calling engine.
- Normalize holidays/breakdowns into strict interval objects.
- Guarantee engine receives canonical machine names and time windows.

### Phase 7 - Piece-Level Pipeline Validation

- Verify piece timeline correctness from imported operations through run output.
- Enforce machine, operator, precedence, and overlap invariants.
- Keep TypeScript verifier and Python verifier parity for conflicts.

### Phase 8 - Quality Gates + Reporting

- Emit deterministic quality report with issue taxonomy and severity.
- Generate run artifacts for every failed check with minimal repro input.
- Gate release on critical pass rate and deterministic rerun stability.

## 6) 120 Runnable Case Plan

- C001-C012: Global settings input/format/derived-window behavior.
- C013-C024: Master clock and timezone correctness.
- C025-C036: Shift and production window validation (including overnight windows).
- C037-C048: Holiday section add/delete/edit and lock-state behavior.
- C049-C060: Breakdown section add/delete/edit and machine filtering behavior.
- C061-C072: Save/load/lock/unlock API integration and persistence consistency.
- C073-C084: Scheduler behavior under holiday/breakdown constraints.
- C085-C096: Piece-level precedence and conflict invariants.
- C097-C108: Negative-path validation (bad payloads, malformed windows, invalid ranges).
- C109-C114: Performance/repeatability at medium-large workloads.
- C115-C120: Audit/reporting completeness and release gate checks.

## 7) Exit Criteria

- No Sev-0 or Sev-1 defects open.
- 100% pass rate for critical checks.
- >= 98% overall pass rate across 500 checks.
- Rerun determinism within approved tolerance.
- Full artifact package for all failures (repro payload + logs + expected vs actual).

## 8) Atomic Checklist (500 Tasks)

### A. Import Contract (CHK-001 to CHK-050)

- [ ] CHK-001 Verify file extension `.xlsx` accepted by import picker.
- [ ] CHK-002 Verify file extension `.xls` accepted by import picker.
- [ ] CHK-003 Verify first worksheet is selected when workbook has multiple sheets.
- [ ] CHK-004 Verify empty workbook throws user-facing error.
- [ ] CHK-005 Verify workbook with empty first sheet throws user-facing error.
- [ ] CHK-006 Verify header `PartNumber` is detected.
- [ ] CHK-007 Verify header alias `part_number` is detected.
- [ ] CHK-008 Verify header alias `part no` is detected.
- [ ] CHK-009 Verify header alias `pn` is detected.
- [ ] CHK-010 Verify header `OperationSeq` is detected.
- [ ] CHK-011 Verify header alias `operation_seq` is detected.
- [ ] CHK-012 Verify header alias `operation` is detected.
- [ ] CHK-013 Verify header alias `op` is detected.
- [ ] CHK-014 Verify header alias `operation no` is detected.
- [ ] CHK-015 Verify header `OperationName` is parsed when present.
- [ ] CHK-016 Verify header `SetupTime_Min` is parsed when present.
- [ ] CHK-017 Verify header `CycleTime_Min` is parsed when present.
- [ ] CHK-018 Verify header `Minimum_BatchSize` is parsed when present.
- [ ] CHK-019 Verify header `EligibleMachines` is parsed when present.
- [ ] CHK-020 Verify header `HandleMachines` is parsed when present.
- [ ] CHK-021 Verify `orderQuantity` alias is parsed.
- [ ] CHK-022 Verify `order_qty` alias is parsed.
- [ ] CHK-023 Verify `qty` alias is parsed.
- [ ] CHK-024 Verify `priority` optional field is parsed.
- [ ] CHK-025 Verify `dueDate` optional field is parsed.
- [ ] CHK-026 Verify `batchMode` optional field is parsed.
- [ ] CHK-027 Verify `customBatchSize` optional field is parsed.
- [ ] CHK-028 Verify direct-row format A import path is selected when quantity exists.
- [ ] CHK-029 Verify grouped format B import path is selected when quantity absent.
- [ ] CHK-030 Verify rows with missing part number are skipped.
- [ ] CHK-031 Verify rows with invalid operation sequence are skipped.
- [ ] CHK-032 Verify rows without operation evidence are skipped in catalog map.
- [ ] CHK-033 Verify positive integer parser rejects zero values.
- [ ] CHK-034 Verify positive integer parser rejects negative values.
- [ ] CHK-035 Verify positive integer parser rejects non-numeric text.
- [ ] CHK-036 Verify setup default fallback is applied when setup missing.
- [ ] CHK-037 Verify cycle default fallback is applied when cycle missing.
- [ ] CHK-038 Verify min-batch fallback is applied when missing.
- [ ] CHK-039 Verify imported operation details map by part and op sequence.
- [ ] CHK-040 Verify operation detail mapping survives mixed-case headers.
- [ ] CHK-041 Verify trailing spaces in `HandleMachines` are normalized.
- [ ] CHK-042 Verify eligible machine list trims comma-separated whitespace.
- [ ] CHK-043 Verify duplicate machine tokens are de-duplicated.
- [ ] CHK-044 Verify import warning shown when no valid rows remain.
- [ ] CHK-045 Verify import throws actionable message on parser exception.
- [ ] CHK-046 Verify unsupported sheet structure gets supported-format guidance.
- [ ] CHK-047 Verify import does not mutate prior successful schedule state on failure.
- [ ] CHK-048 Verify import state resets correctly after re-import.
- [ ] CHK-049 Verify imported catalog map size matches unique part/op pairs.
- [ ] CHK-050 Verify imported order count matches valid order rows.

### B. Personnel Parsing (CHK-051 to CHK-100)

- [ ] CHK-051 Verify personnel parser detects production section marker.
- [ ] CHK-052 Verify personnel parser detects setup section marker.
- [ ] CHK-053 Verify parser handles mixed-case section labels.
- [ ] CHK-054 Verify parser handles whitespace around section labels.
- [ ] CHK-055 Verify parser identifies schema marker row and logs warning.
- [ ] CHK-056 Verify parser ignores schema marker row as data.
- [ ] CHK-057 Verify parser requires UID column presence.
- [ ] CHK-058 Verify parser requires Name column presence.
- [ ] CHK-059 Verify parser requires level-up column presence.
- [ ] CHK-060 Verify missing required columns returns critical issue.
- [ ] CHK-061 Verify incomplete personnel row is skipped with warning.
- [ ] CHK-062 Verify invalid level-up value falls back safely.
- [ ] CHK-063 Verify duplicate UID conflict emits issue.
- [ ] CHK-064 Verify duplicate Name conflict emits issue.
- [ ] CHK-065 Verify same person can exist in setup and production roles if allowed.
- [ ] CHK-066 Verify role-specific assignment priority is respected.
- [ ] CHK-067 Verify setup-only team members are not used for production run.
- [ ] CHK-068 Verify production-only members are not used for setup if prohibited.
- [ ] CHK-069 Verify parser summary counts production rows correctly.
- [ ] CHK-070 Verify parser summary counts setup rows correctly.
- [ ] CHK-071 Verify parser summary counts valid profiles correctly.
- [ ] CHK-072 Verify parser preserves unicode names where present.
- [ ] CHK-073 Verify parser trims leading/trailing spaces in names.
- [ ] CHK-074 Verify parser trims leading/trailing spaces in UIDs.
- [ ] CHK-075 Verify parser rejects blank UID + blank Name row.
- [ ] CHK-076 Verify parser flags missing section context issue.
- [ ] CHK-077 Verify parser handles interleaved operation/person rows.
- [ ] CHK-078 Verify parser handles all-personnel-at-bottom sheet layout.
- [ ] CHK-079 Verify parser handles all-personnel-at-top sheet layout.
- [ ] CHK-080 Verify parser behaves with zero personnel rows.
- [ ] CHK-081 Verify scheduler uses parsed personnel profile list.
- [ ] CHK-082 Verify scheduler no longer falls back to synthetic `A/B/C/D` when profiles present.
- [ ] CHK-083 Verify assigned setup person exists in parsed profiles.
- [ ] CHK-084 Verify assigned production person exists in parsed profiles.
- [ ] CHK-085 Verify personnel issue list is surfaced in debug report.
- [ ] CHK-086 Verify parser performance for 1k personnel rows.
- [ ] CHK-087 Verify parser performance for sparse mixed sheets.
- [ ] CHK-088 Verify parser is deterministic across reruns.
- [ ] CHK-089 Verify parser handles non-string UID types.
- [ ] CHK-090 Verify parser handles numeric Name cells safely.
- [ ] CHK-091 Verify parser ignores hidden columns unrelated to schema.
- [ ] CHK-092 Verify parser tolerates unknown extra columns.
- [ ] CHK-093 Verify parser rejects fully malformed personnel block.
- [ ] CHK-094 Verify parser error text points to likely fix.
- [ ] CHK-095 Verify parser can parse current `import_input.xlsx` sections.
- [ ] CHK-096 Verify parsed personnel count matches expected from source.
- [ ] CHK-097 Verify parsed production rows detected count equals 4 for integration fixture.
- [ ] CHK-098 Verify parsed setup rows detected count equals 4 for integration fixture.
- [ ] CHK-099 Verify schema marker warning appears for integration fixture.
- [ ] CHK-100 Verify no fatal parser issues for integration fixture.

### C. Scheduling Constraints (CHK-101 to CHK-150)

- [ ] CHK-101 Verify fixed machine is respected when machine specified.
- [ ] CHK-102 Verify machine fallback uses eligible list when fixed machine absent.
- [ ] CHK-103 Verify machine fallback avoids blocked machine in breakdown window.
- [ ] CHK-104 Verify machine fallback avoids holiday windows.
- [ ] CHK-105 Verify setup occurs only inside setup window.
- [ ] CHK-106 Verify run occurs only inside production window.
- [ ] CHK-107 Verify setup can pause over non-working windows.
- [ ] CHK-108 Verify run can pause over non-working windows where applicable.
- [ ] CHK-109 Verify due-date miss emits warning status.
- [ ] CHK-110 Verify due-date hit emits no due warning.
- [ ] CHK-111 Verify operation sequence order preserved per piece.
- [ ] CHK-112 Verify setup and run intervals are non-negative duration.
- [ ] CHK-113 Verify setup does not overlap run on same machine.
- [ ] CHK-114 Verify two runs do not overlap on same machine.
- [ ] CHK-115 Verify setup/setup intervals do not overlap for same operator.
- [ ] CHK-116 Verify setup/run intervals do not overlap for same operator.
- [ ] CHK-117 Verify single-machine handle mode forbids operator run overlap.
- [ ] CHK-118 Verify double-machine handle mode permits two concurrent runs.
- [ ] CHK-119 Verify triple concurrent run exceeds capacity and is flagged.
- [ ] CHK-120 Verify mixed single+double overlap is blocked for same person.
- [ ] CHK-121 Verify breakdown mid-run pauses production correctly.
- [ ] CHK-122 Verify breakdown mid-setup pauses setup correctly.
- [ ] CHK-123 Verify holiday start boundary is respected.
- [ ] CHK-124 Verify holiday end boundary is respected.
- [ ] CHK-125 Verify overnight setup window is handled correctly.
- [ ] CHK-126 Verify overnight production window is handled correctly.
- [ ] CHK-127 Verify operation without eligible machine fails with clear message.
- [ ] CHK-128 Verify impossible setup slot fails within bounded horizon.
- [ ] CHK-129 Verify bounded horizon error is actionable.
- [ ] CHK-130 Verify scheduler row machine field is always populated.
- [ ] CHK-131 Verify scheduler row setup person field is always populated.
- [ ] CHK-132 Verify scheduler row production person field is always populated.
- [ ] CHK-133 Verify scheduler row handle mode normalized to `single` or `double`.
- [ ] CHK-134 Verify operation details are consumed from imported map, not stale master default.
- [ ] CHK-135 Verify minimum batch size influences batching behavior.
- [ ] CHK-136 Verify custom batch size overrides default where configured.
- [ ] CHK-137 Verify priority influences dispatch ordering where expected.
- [ ] CHK-138 Verify start datetime is respected as lower bound.
- [ ] CHK-139 Verify dependent op start never precedes predecessor completion.
- [ ] CHK-140 Verify setup end <= first run start for each operation.
- [ ] CHK-141 Verify run end timestamps are monotonic per operation.
- [ ] CHK-142 Verify machine calendar intervals remain sorted.
- [ ] CHK-143 Verify operator calendar intervals remain sorted.
- [ ] CHK-144 Verify deterministic output remains identical on rerun with same input.
- [ ] CHK-145 Verify schedule generation remains under threshold for medium case.
- [ ] CHK-146 Verify schedule generation remains under threshold for large case.
- [ ] CHK-147 Verify scheduler emits failure when no engine available.
- [ ] CHK-148 Verify UI catches scheduler exception and surfaces message.
- [ ] CHK-149 Verify scheduling failure does not silently produce partial rows.
- [ ] CHK-150 Verify successful schedule produces non-empty rows and piece timeline.

### D. Piece Flow Integrity (CHK-151 to CHK-200)

- [ ] CHK-151 Verify piece timeline row exists for each piece/op pair.
- [ ] CHK-152 Verify piece IDs are unique per batch.
- [ ] CHK-153 Verify piece timeline carries correct part number.
- [ ] CHK-154 Verify piece timeline carries correct batch ID.
- [ ] CHK-155 Verify piece timeline carries operation sequence.
- [ ] CHK-156 Verify piece timeline carries machine assignment.
- [ ] CHK-157 Verify piece timeline carries operator assignment.
- [ ] CHK-158 Verify piece timeline carries run start timestamp.
- [ ] CHK-159 Verify piece timeline carries run end timestamp.
- [ ] CHK-160 Verify piece timeline row count equals qty \* op_count for simple batches.
- [ ] CHK-161 Verify op2 piece start >= op1 piece end for same piece.
- [ ] CHK-162 Verify op3 piece start >= op2 piece end for same piece.
- [ ] CHK-163 Verify no backward timestamp movement for a piece chain.
- [ ] CHK-164 Verify per-piece operation order is strictly increasing.
- [ ] CHK-165 Verify no piece is dropped between operations.
- [ ] CHK-166 Verify no extra phantom piece is created.
- [ ] CHK-167 Verify piece timeline sorted by run start in output.
- [ ] CHK-168 Verify operation summary totals match piece timeline totals.
- [ ] CHK-169 Verify setup segments align with operation summary setup start/end.
- [ ] CHK-170 Verify piece flow map consumes true timeline when provided.
- [ ] CHK-171 Verify synthetic fallback is not used when timeline present.
- [ ] CHK-172 Verify synthetic fallback is used only when timeline absent.
- [ ] CHK-173 Verify lane mode `machine` renders machine-based lanes.
- [ ] CHK-174 Verify lane mode `operation` renders operation-based lanes.
- [ ] CHK-175 Verify lane counts match unique machine/op count.
- [ ] CHK-176 Verify piece-flow filtering by operation works.
- [ ] CHK-177 Verify piece-flow filtering by machine works.
- [ ] CHK-178 Verify piece-flow filtering by batch works.
- [ ] CHK-179 Verify live replay `--live-pieces` limit works.
- [ ] CHK-180 Verify live replay `--live-operations` filter works.
- [ ] CHK-181 Verify live replay `--live-machines` filter works.
- [ ] CHK-182 Verify live replay emits expected event count.
- [ ] CHK-183 Verify piece timeline CSV column schema is stable.
- [ ] CHK-184 Verify operation summary CSV column schema is stable.
- [ ] CHK-185 Verify piece live events CSV column schema is stable.
- [ ] CHK-186 Verify zero-delay live mode completes without timing errors.
- [ ] CHK-187 Verify piece timeline handles large event counts.
- [ ] CHK-188 Verify piece timeline generation remains deterministic.
- [ ] CHK-189 Verify piece timeline for mixed handle modes remains valid.
- [ ] CHK-190 Verify piece timeline for breakdown interruptions remains valid.
- [ ] CHK-191 Verify piece timeline for holiday pauses remains valid.
- [ ] CHK-192 Verify piece timeline for overnight windows remains valid.
- [ ] CHK-193 Verify piece timeline with multiple batches keeps chain per batch.
- [ ] CHK-194 Verify piece timeline with shared machines keeps exclusivity.
- [ ] CHK-195 Verify piece timeline with shared operators keeps policy limits.
- [ ] CHK-196 Verify piece-level precedence violations are flagged by verifier.
- [ ] CHK-197 Verify machine overlaps are flagged by verifier.
- [ ] CHK-198 Verify person overlaps are flagged by verifier.
- [ ] CHK-199 Verify verifier warning list is populated for due misses.
- [ ] CHK-200 Verify verifier valid flag false when errors exist.

### E. Error Handling & Negative Paths (CHK-201 to CHK-250)

- [ ] CHK-201 Verify invalid datetime format returns specific parse error.
- [ ] CHK-202 Verify invalid window format returns specific parse error.
- [ ] CHK-203 Verify missing `batches` key returns specific schema error.
- [ ] CHK-204 Verify missing `operations` array returns specific schema error.
- [ ] CHK-205 Verify missing `operation_seq` returns specific schema error.
- [ ] CHK-206 Verify missing `operation_name` returns specific schema error.
- [ ] CHK-207 Verify missing `setup_time_min` returns specific schema error.
- [ ] CHK-208 Verify missing `cycle_time_min` returns specific schema error.
- [ ] CHK-209 Verify missing `start_datetime` returns specific schema error.
- [ ] CHK-210 Verify missing `batch_qty` returns specific schema error.
- [ ] CHK-211 Verify zero `batch_qty` rejected with actionable message.
- [ ] CHK-212 Verify negative `batch_qty` rejected with actionable message.
- [ ] CHK-213 Verify zero `cycle_time_min` policy behavior is explicit.
- [ ] CHK-214 Verify negative `cycle_time_min` is rejected.
- [ ] CHK-215 Verify negative `setup_time_min` is rejected.
- [ ] CHK-216 Verify non-numeric setup/cycle values are rejected.
- [ ] CHK-217 Verify invalid holidays array item is rejected.
- [ ] CHK-218 Verify invalid breakdown datetime range is rejected.
- [ ] CHK-219 Verify breakdown end before start is rejected.
- [ ] CHK-220 Verify breakdown machine missing is rejected.
- [ ] CHK-221 Verify unknown machine token in eligible list is warned.
- [ ] CHK-222 Verify unknown handle mode token defaults safely.
- [ ] CHK-223 Verify empty eligible machine list fails clearly.
- [ ] CHK-224 Verify impossible windows (no production time) fail clearly.
- [ ] CHK-225 Verify impossible setup windows fail clearly.
- [ ] CHK-226 Verify missing shifts mapping for operator fails clearly.
- [ ] CHK-227 Verify invalid shift window string fails clearly.
- [ ] CHK-228 Verify malformed JSON input fails with parse message.
- [ ] CHK-229 Verify missing input file fails with path message.
- [ ] CHK-230 Verify unreadable input file fails with permission message.
- [ ] CHK-231 Verify CLI without `--input` and `--demo` fails with guidance.
- [ ] CHK-232 Verify CLI invalid `--demo` option fails with argparse message.
- [ ] CHK-233 Verify CLI invalid `--lane-mode` fails with argparse message.
- [ ] CHK-234 Verify CLI invalid `--machine-mode` fails with argparse message.
- [ ] CHK-235 Verify CLI malformed `--live-operations` fails clearly.
- [ ] CHK-236 Verify CLI malformed `--live-machines` is handled safely.
- [ ] CHK-237 Verify import catches thrown exception and preserves UI stability.
- [ ] CHK-238 Verify scheduling exception surfaces exact root message in alert.
- [ ] CHK-239 Verify verification exception does not crash scheduler page.
- [ ] CHK-240 Verify failed run still writes diagnostic artifact when possible.
- [ ] CHK-241 Verify error code taxonomy is consistent across checks.
- [ ] CHK-242 Verify error message includes offending field name.
- [ ] CHK-243 Verify error message includes offending row or case ID.
- [ ] CHK-244 Verify warning message includes operation and machine context.
- [ ] CHK-245 Verify due warning includes run_end and due timestamps.
- [ ] CHK-246 Verify overlap errors include time coordinate.
- [ ] CHK-247 Verify overlap errors include resource identifier.
- [ ] CHK-248 Verify parser errors are deterministic across reruns.
- [ ] CHK-249 Verify one failure does not mask additional detectable failures.
- [ ] CHK-250 Verify failure report includes remediation hint.

### F. Conflict Taxonomy Parity (CHK-251 to CHK-300)

- [ ] CHK-251 Verify `MACHINE_CONFLICT` case is detectable.
- [ ] CHK-252 Verify `PERSON_CONFLICT` case is detectable.
- [ ] CHK-253 Verify `PN_CONFLICT` case is detectable.
- [ ] CHK-254 Verify `HOLIDAY_CONFLICT` case is detectable.
- [ ] CHK-255 Verify `MACHINE_AVAILABILITY_CONFLICT` case is detectable.
- [ ] CHK-256 Verify conflict scanner order is deterministic.
- [ ] CHK-257 Verify expected-present code assertions pass for TC02.
- [ ] CHK-258 Verify expected-present code assertions pass for TC03.
- [ ] CHK-259 Verify expected-present code assertions pass for TC04.
- [ ] CHK-260 Verify expected-present code assertions pass for TC08.
- [ ] CHK-261 Verify expected-absent code assertions pass for TC01.
- [ ] CHK-262 Verify expected-absent code assertions pass for TC05.
- [ ] CHK-263 Verify expected-absent code assertions pass for TC06.
- [ ] CHK-264 Verify expected-absent code assertions pass for TC07.
- [ ] CHK-265 Verify `setup_only` mode suppresses run-person conflicts.
- [ ] CHK-266 Verify `setup_and_run` mode enables run-person conflicts.
- [ ] CHK-267 Verify conflict report includes found code set.
- [ ] CHK-268 Verify conflict report includes expected-present set.
- [ ] CHK-269 Verify conflict report includes expected-absent set.
- [ ] CHK-270 Verify conflict report includes missing-expected set.
- [ ] CHK-271 Verify conflict report includes unexpected-present set.
- [ ] CHK-272 Verify conflict report includes per-case status.
- [ ] CHK-273 Verify suite report `all_passed` true when no failures.
- [ ] CHK-274 Verify suite report total equals number of manifest cases.
- [ ] CHK-275 Verify suite report passed+failed equals total.
- [ ] CHK-276 Verify suite report references manifest path.
- [ ] CHK-277 Verify suite report includes generation timestamp.
- [ ] CHK-278 Verify per-case conflict_count matches found_codes length.
- [ ] CHK-279 Verify scheduler validation payload embedded in suite report.
- [ ] CHK-280 Verify embedded scheduler stats include operation_rows.
- [ ] CHK-281 Verify embedded scheduler stats include machine count.
- [ ] CHK-282 Verify embedded scheduler stats include operator count.
- [ ] CHK-283 Verify parity map from JS codes to Python codes is documented.
- [ ] CHK-284 Verify parity map flags unsupported code translations.
- [ ] CHK-285 Verify no silent code renaming without mapping entry.
- [ ] CHK-286 Verify conflict suite handles mixed-case manifest codes.
- [ ] CHK-287 Verify conflict suite rejects unknown expected code token.
- [ ] CHK-288 Verify conflict suite rejects malformed manifest case entry.
- [ ] CHK-289 Verify conflict suite handles missing testcase file gracefully.
- [ ] CHK-290 Verify conflict suite handles invalid testcase JSON gracefully.
- [ ] CHK-291 Verify conflict suite skips or fails empty testcase by policy.
- [ ] CHK-292 Verify conflict suite run is deterministic across reruns.
- [ ] CHK-293 Verify conflict suite runtime remains under budget.
- [ ] CHK-294 Verify conflict suite output location is configurable.
- [ ] CHK-295 Verify conflict suite does not overwrite unrelated outputs.
- [ ] CHK-296 Verify conflict suite includes evidence logs for conflicts.
- [ ] CHK-297 Verify conflict suite evidence includes timestamp context.
- [ ] CHK-298 Verify conflict suite evidence includes resource context.
- [ ] CHK-299 Verify conflict suite supports small/medium/large tags.
- [ ] CHK-300 Verify conflict suite results are consumable by final report generator.

### G. Small-to-Complex Scenario Ladder (CHK-301 to CHK-350)

- [ ] CHK-301 Verify tiny case (qty 1, op1 only) runs successfully.
- [ ] CHK-302 Verify tiny case with two ops preserves precedence.
- [ ] CHK-303 Verify tiny case with fixed machine constraint.
- [ ] CHK-304 Verify tiny case with no due date remains warning-free.
- [ ] CHK-305 Verify tiny case with tight due date can warn.
- [ ] CHK-306 Verify small case (3 parts) with mixed machine eligibility.
- [ ] CHK-307 Verify small case with one breakdown interval.
- [ ] CHK-308 Verify small case with one holiday date.
- [ ] CHK-309 Verify small case with setup pause across closed window.
- [ ] CHK-310 Verify small case with double-machine overlap allowance.
- [ ] CHK-311 Verify small case with single-machine overlap rejection.
- [ ] CHK-312 Verify small case with operator scarcity scheduling.
- [ ] CHK-313 Verify small multi-batch same part chain integrity.
- [ ] CHK-314 Verify small multi-batch cross-part machine contention.
- [ ] CHK-315 Verify medium case (10 parts) completes under time budget.
- [ ] CHK-316 Verify medium case generates expected artifact set.
- [ ] CHK-317 Verify medium case with staggered start datetimes.
- [ ] CHK-318 Verify medium case with mixed priorities.
- [ ] CHK-319 Verify medium case with custom batch sizes.
- [ ] CHK-320 Verify medium case quantity conservation end-to-end.
- [ ] CHK-321 Verify medium case piece row volume matches formula.
- [ ] CHK-322 Verify medium case no machine overlaps.
- [ ] CHK-323 Verify medium case no person policy violations.
- [ ] CHK-324 Verify medium case no operation ordering violations.
- [ ] CHK-325 Verify large case (25 parts) completes under time budget.
- [ ] CHK-326 Verify large case memory remains under threshold.
- [ ] CHK-327 Verify large case warnings are bounded and explainable.
- [ ] CHK-328 Verify large case deterministic rerun row equality.
- [ ] CHK-329 Verify large case deterministic rerun timeline equality.
- [ ] CHK-330 Verify very large case (250-piece equivalent) runs to completion.
- [ ] CHK-331 Verify very large case exports all expected files.
- [ ] CHK-332 Verify very large case conflict scan completes.
- [ ] CHK-333 Verify very large case due-warning handling quality.
- [ ] CHK-334 Verify very large case remains valid when no conflicts expected.
- [ ] CHK-335 Verify complex case with multiple holidays.
- [ ] CHK-336 Verify complex case with overlapping breakdown windows.
- [ ] CHK-337 Verify complex case with overnight shifts.
- [ ] CHK-338 Verify complex case with constrained personnel pool.
- [ ] CHK-339 Verify complex case with machine availability cutoff.
- [ ] CHK-340 Verify complex case with mixed single/double handle mode.
- [ ] CHK-341 Verify complex case with malformed row injection fails cleanly.
- [ ] CHK-342 Verify complex case with partial salvage policy is explicit.
- [ ] CHK-343 Verify complex case with all constraints still deterministic.
- [ ] CHK-344 Verify complex case piece precedence remains intact.
- [ ] CHK-345 Verify complex case output remains report-consumable.
- [ ] CHK-346 Verify complexity ladder metadata captured per case.
- [ ] CHK-347 Verify each case maps to exactly one primary complexity level.
- [ ] CHK-348 Verify escalation rules from L1 to L5 documented.
- [ ] CHK-349 Verify blocker defects discovered in lower levels gate higher levels.
- [ ] CHK-350 Verify final ladder completion summary is generated.

### H. Performance & Stability (CHK-351 to CHK-400)

- [ ] CHK-351 Verify import parse runtime recorded for baseline file.
- [ ] CHK-352 Verify import parse runtime recorded for 2x synthetic size.
- [ ] CHK-353 Verify import parse runtime recorded for 5x synthetic size.
- [ ] CHK-354 Verify schedule runtime recorded for tiny case.
- [ ] CHK-355 Verify schedule runtime recorded for small case.
- [ ] CHK-356 Verify schedule runtime recorded for medium case.
- [ ] CHK-357 Verify schedule runtime recorded for large case.
- [ ] CHK-358 Verify schedule runtime recorded for complex case.
- [ ] CHK-359 Verify piece timeline generation runtime recorded.
- [ ] CHK-360 Verify conflict suite runtime recorded.
- [ ] CHK-361 Verify p50 runtime metric computed.
- [ ] CHK-362 Verify p95 runtime metric computed.
- [ ] CHK-363 Verify max runtime metric computed.
- [ ] CHK-364 Verify runtime regression threshold is defined.
- [ ] CHK-365 Verify runtime regression alert triggers above threshold.
- [ ] CHK-366 Verify memory usage sampled for large cases.
- [ ] CHK-367 Verify memory cap threshold is defined.
- [ ] CHK-368 Verify memory regression alert triggers above threshold.
- [ ] CHK-369 Verify disk artifact size tracked by run.
- [ ] CHK-370 Verify artifact generation does not exceed storage budget.
- [ ] CHK-371 Verify rerun #1 equals baseline for operation summary.
- [ ] CHK-372 Verify rerun #2 equals baseline for operation summary.
- [ ] CHK-373 Verify rerun #1 equals baseline for piece timeline.
- [ ] CHK-374 Verify rerun #2 equals baseline for piece timeline.
- [ ] CHK-375 Verify rerun hash checksums are stable.
- [ ] CHK-376 Verify log message ordering is stable where deterministic.
- [ ] CHK-377 Verify no nondeterministic sorting artifacts.
- [ ] CHK-378 Verify no random seed dependency without explicit seed.
- [ ] CHK-379 Verify scheduler handles 10 consecutive runs without crash.
- [ ] CHK-380 Verify scheduler handles 50 consecutive runs without leak signal.
- [ ] CHK-381 Verify verifier handles 10 consecutive runs without crash.
- [ ] CHK-382 Verify verifier handles 50 consecutive runs without leak signal.
- [ ] CHK-383 Verify conflict suite handles 10 consecutive runs without crash.
- [ ] CHK-384 Verify parallel test execution does not cross-contaminate outputs.
- [ ] CHK-385 Verify unique output directories per run prevent collisions.
- [ ] CHK-386 Verify stale output cleanup policy is documented.
- [ ] CHK-387 Verify stale output cleanup does not remove unrelated folders.
- [ ] CHK-388 Verify failure runs still emit partial diagnostics quickly.
- [ ] CHK-389 Verify timeout policy per case is defined.
- [ ] CHK-390 Verify timeout events are reported distinctly from logic failures.
- [ ] CHK-391 Verify command exit codes are captured in report.
- [ ] CHK-392 Verify stdout/stderr snapshots are captured for failed runs.
- [ ] CHK-393 Verify warning-only runs are classified as pass-with-warning.
- [ ] CHK-394 Verify intermittent failures are retried per policy.
- [ ] CHK-395 Verify flaky-case quarantine workflow is documented.
- [ ] CHK-396 Verify performance metrics are version-stamped.
- [ ] CHK-397 Verify performance dashboard includes trend lines.
- [ ] CHK-398 Verify trend regression gate blocks release if severe.
- [ ] CHK-399 Verify stability summary includes pass rate and variance.
- [ ] CHK-400 Verify stability evidence included in final signoff package.

### I. Reporting, Traceability, and Governance (CHK-401 to CHK-450)

- [ ] CHK-401 Verify each check maps to a case ID.
- [ ] CHK-402 Verify each case maps to an owning epic.
- [ ] CHK-403 Verify each failure maps to severity level.
- [ ] CHK-404 Verify each failure has owner and ETA.
- [ ] CHK-405 Verify each failure has reproduction command.
- [ ] CHK-406 Verify each failure includes minimal failing input.
- [ ] CHK-407 Verify each failure includes expected vs actual output.
- [ ] CHK-408 Verify each failure includes impacted constraints.
- [ ] CHK-409 Verify each failure includes recommended fix path.
- [ ] CHK-410 Verify each closed defect includes validation rerun evidence.
- [ ] CHK-411 Verify final report includes environment metadata.
- [ ] CHK-412 Verify final report includes code revision metadata.
- [ ] CHK-413 Verify final report includes dataset fingerprint.
- [ ] CHK-414 Verify final report includes command manifest.
- [ ] CHK-415 Verify final report includes artifact index.
- [ ] CHK-416 Verify final report includes risk register.
- [ ] CHK-417 Verify final report includes known limitations.
- [ ] CHK-418 Verify final report includes parity mismatch notes.
- [ ] CHK-419 Verify final report includes release recommendation.
- [ ] CHK-420 Verify final report includes rollback triggers.
- [ ] CHK-421 Verify pass/fail criteria are clearly stated.
- [ ] CHK-422 Verify warning policy is clearly stated.
- [ ] CHK-423 Verify severity rubric is clearly stated.
- [ ] CHK-424 Verify defect SLA targets are clearly stated.
- [ ] CHK-425 Verify triage workflow is clearly stated.
- [ ] CHK-426 Verify escalation workflow is clearly stated.
- [ ] CHK-427 Verify blocker handling workflow is clearly stated.
- [ ] CHK-428 Verify signoff approvers list is current.
- [ ] CHK-429 Verify signoff date and scope are captured.
- [ ] CHK-430 Verify unresolved risks are accepted explicitly.
- [ ] CHK-431 Verify reproducibility appendix is complete.
- [ ] CHK-432 Verify case-to-check coverage table totals 500.
- [ ] CHK-433 Verify case count in report totals 120.
- [ ] CHK-434 Verify critical check subset listed explicitly.
- [ ] CHK-435 Verify critical check pass rate computed separately.
- [ ] CHK-436 Verify non-critical check pass rate computed separately.
- [ ] CHK-437 Verify warning density metric computed.
- [ ] CHK-438 Verify defect density metric computed.
- [ ] CHK-439 Verify reopen rate metric computed.
- [ ] CHK-440 Verify mean time to fix metric computed.
- [ ] CHK-441 Verify failure clustering by module analyzed.
- [ ] CHK-442 Verify top recurring error messages listed.
- [ ] CHK-443 Verify top recurring warning messages listed.
- [ ] CHK-444 Verify machine-level heatmap data exported.
- [ ] CHK-445 Verify operation-level heatmap data exported.
- [ ] CHK-446 Verify person-level load summary exported.
- [ ] CHK-447 Verify due-risk summary exported.
- [ ] CHK-448 Verify conflict taxonomy summary exported.
- [ ] CHK-449 Verify executive summary is non-technical and accurate.
- [ ] CHK-450 Verify technical appendix includes raw evidence links.

### J. CI Gates and Release Readiness (CHK-451 to CHK-500)

- [ ] CHK-451 Verify CI job runs import contract suite.
- [ ] CHK-452 Verify CI job runs personnel parser suite.
- [ ] CHK-453 Verify CI job runs deterministic handle-mode suite.
- [ ] CHK-454 Verify CI job runs piece verifier suite.
- [ ] CHK-455 Verify CI job runs conflict suite.
- [ ] CHK-456 Verify CI publishes artifact bundle on completion.
- [ ] CHK-457 Verify CI publishes artifact bundle on failure.
- [ ] CHK-458 Verify CI marks build failed for critical check failure.
- [ ] CHK-459 Verify CI marks build unstable for warning-threshold breach.
- [ ] CHK-460 Verify CI retains artifacts for configured duration.
- [ ] CHK-461 Verify CI includes checksum manifest for artifacts.
- [ ] CHK-462 Verify CI includes case pass/fail summary JSON.
- [ ] CHK-463 Verify CI includes check pass/fail summary JSON.
- [ ] CHK-464 Verify CI includes machine-readable defect list.
- [ ] CHK-465 Verify CI includes markdown human-readable report.
- [ ] CHK-466 Verify release gate blocks on Sev-0 defects.
- [ ] CHK-467 Verify release gate blocks on Sev-1 defects.
- [ ] CHK-468 Verify release gate blocks on critical-check failures.
- [ ] CHK-469 Verify release gate blocks below overall pass threshold.
- [ ] CHK-470 Verify release gate blocks on missing artifacts.
- [ ] CHK-471 Verify release gate blocks on nondeterministic rerun mismatch.
- [ ] CHK-472 Verify release gate blocks on performance regression breach.
- [ ] CHK-473 Verify release gate allows warning-only runs within policy.
- [ ] CHK-474 Verify release gate emits clear block reason text.
- [ ] CHK-475 Verify release gate emits remediation checklist.
- [ ] CHK-476 Verify manual override path requires approver identity.
- [ ] CHK-477 Verify manual override path requires risk justification.
- [ ] CHK-478 Verify manual override is logged and auditable.
- [ ] CHK-479 Verify post-release monitor checklist is generated.
- [ ] CHK-480 Verify post-release smoke suite command is documented.
- [ ] CHK-481 Verify rollback decision matrix is attached.
- [ ] CHK-482 Verify rollback command set is validated.
- [ ] CHK-483 Verify rollback artifacts are version-compatible.
- [ ] CHK-484 Verify rollback test run is scheduled.
- [ ] CHK-485 Verify release notes include verification scope.
- [ ] CHK-486 Verify release notes include known warnings.
- [ ] CHK-487 Verify release notes include deferred defects.
- [ ] CHK-488 Verify release notes include mitigation actions.
- [ ] CHK-489 Verify final signoff includes QA owner approval.
- [ ] CHK-490 Verify final signoff includes engineering owner approval.
- [ ] CHK-491 Verify final signoff includes product owner approval.
- [ ] CHK-492 Verify final signoff includes operations owner approval.
- [ ] CHK-493 Verify final signoff package archived in reports folder.
- [ ] CHK-494 Verify final signoff package hash is recorded.
- [ ] CHK-495 Verify final signoff package is reproducible from commands.
- [ ] CHK-496 Verify next-cycle backlog is seeded from failures.
- [ ] CHK-497 Verify next-cycle backlog prioritization is severity-based.
- [ ] CHK-498 Verify next-cycle backlog includes performance follow-ups.
- [ ] CHK-499 Verify next-cycle backlog includes taxonomy parity follow-ups.
- [ ] CHK-500 Verify release recommendation (`GO`/`NO-GO`) is explicit and justified.

## 9) Deliverables

- PRD and 500-check master checklist (this file).
- Preflight execution report with baseline evidence.
- Full execution report after 120-case run.
