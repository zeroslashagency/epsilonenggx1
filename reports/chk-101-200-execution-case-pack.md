# CHK-101..CHK-200 Execution-Ready Case Pack

Scope: scheduler constraints + piece flow integrity.
Harnesses used: existing deterministic handle-mode Jest tests and Python verifier CLI.

## Case 01 - Fixed Machine Respect

- Checks: CHK-101
- Required input: in-test JSON fixture inside `tests/test_piece_level_verifier.py` (`test_fixed_machine_is_respected_when_machine_is_present`)
- Command:

```bash
python3 -m pytest tests/test_piece_level_verifier.py::test_fixed_machine_is_respected_when_machine_is_present -q
```

- Expected artifacts/assertions: test passes; generated `operation_summary.csv` has `Machine == VMC 2`.

## Case 02 - Eligible Fallback + Breakdown Avoidance

- Checks: CHK-102, CHK-103, CHK-130
- Required input: `tests/fixtures/chk_101_200/chk102_machine_fallback_eligible.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk102_machine_fallback_eligible.json --out-dir out/chk101_200/case02
python3 -c "import csv; r=list(csv.DictReader(open('out/chk101_200/case02/operation_summary.csv'))); assert len(r)==1; assert r[0]['Machine']=='VMC 2'; print('OK case02')"
```

- Expected artifacts/assertions: `operation_summary.csv`, `piece_timeline.csv`, `piece_live_events.csv`, `validation_report.json`, `piece_flow.html`, `piece_flow_map.html`; machine selected as `VMC 2`.

## Case 03 - Holiday Blocking Boundary

- Checks: CHK-104, CHK-123, CHK-124
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`respects holiday blocking for setup and run`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts -t "respects holiday blocking for setup and run"
```

- Expected artifacts/assertions: test passes; setup/run start are on/after holiday end timestamp.

## Case 04 - Setup Window + Setup Pause

- Checks: CHK-105, CHK-107
- Required input: in-test JSON fixture inside `tests/test_piece_level_verifier.py` (`test_setup_can_pause_across_unavailable_windows`)
- Command:

```bash
python3 -m pytest tests/test_piece_level_verifier.py::test_setup_can_pause_across_unavailable_windows -q
```

- Expected artifacts/assertions: test passes; setup span (`SetupEnd-SetupStart`) is greater than active setup minutes.

## Case 05 - Production Window + Run Pause

- Checks: CHK-106, CHK-108
- Required input: `tests/fixtures/chk_101_200/chk106_run_pause_window.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk106_run_pause_window.json --out-dir out/chk101_200/case05
python3 -c "import csv,datetime as dt; r=list(csv.DictReader(open('out/chk101_200/case05/operation_summary.csv')))[0]; s=dt.datetime.strptime(r['RunStart'],'%Y-%m-%d %H:%M'); e=dt.datetime.strptime(r['RunEnd'],'%Y-%m-%d %H:%M'); assert e.date()>s.date(); print('OK case05')"
```

- Expected artifacts/assertions: run extends into next day because production window closes daily.

## Case 06 - Due Miss Warning

- Checks: CHK-109, CHK-199
- Required input: `tests/fixtures/chk_101_200/chk109_due_miss.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk109_due_miss.json --out-dir out/chk101_200/case06
python3 -c "import json; v=json.load(open('out/chk101_200/case06/validation_report.json')); assert any('[DUE]' in w for w in v.get('warnings',[])); print('OK case06')"
```

- Expected artifacts/assertions: validation warning list includes due miss entry.

## Case 07 - Due Hit No Warning

- Checks: CHK-110
- Required input: `tests/fixtures/chk_101_200/chk110_due_hit.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk110_due_hit.json --out-dir out/chk101_200/case07
python3 -c "import json; v=json.load(open('out/chk101_200/case07/validation_report.json')); assert not any('[DUE]' in w for w in v.get('warnings',[])); print('OK case07')"
```

- Expected artifacts/assertions: no due warning entries.

## Case 08 - Baseline Validity and Artifact Completeness

- Checks: CHK-111, CHK-138, CHK-140, CHK-150
- Required input: built-in verifier demo (`--demo batch3`)
- Command:

```bash
python3 -m pytest tests/test_piece_level_verifier.py::test_demo_batch3_runs -q
```

- Expected artifacts/assertions: all core output files exist; validation JSON contains `valid` and `errors` keys.

## Case 09 - No Negative/Overlap Intervals

- Checks: CHK-112, CHK-113, CHK-114, CHK-115
- Required input: built-in verifier demo (`--demo batch3`)
- Commands:

```bash
python3 scripts/piece_level_verifier.py --demo batch3 --out-dir out/chk101_200/case09
python3 -c "import json; v=json.load(open('out/chk101_200/case09/validation_report.json')); assert v['valid'] is True; assert len(v['errors'])==0; print('OK case09')"
```

- Expected artifacts/assertions: validation passes with zero errors (machine/operator overlap + ordering checks).

## Case 10 - Setup/Run Same-Person Blocking

- Checks: CHK-116, CHK-131, CHK-132
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`prevents setup-run overlap for same person`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts -t "prevents setup-run overlap for same person"
```

- Expected artifacts/assertions: test passes; same person assigned and second setup starts after first run end.

## Case 11 - Handle Mode Single Blocks Overlap

- Checks: CHK-117, CHK-133
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`blocks overlap for single-machine runs on the same production person`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts -t "blocks overlap for single-machine runs on the same production person"
```

- Expected artifacts/assertions: test passes; single-mode intervals are non-overlapping.

## Case 12 - Handle Mode Double Allows Overlap

- Checks: CHK-118
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`allows overlap for double-machine runs on the same production person`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts -t "allows overlap for double-machine runs on the same production person"
```

- Expected artifacts/assertions: test passes; overlap exists for same production person in double mode.

## Case 13 - Triple Concurrency Capacity Flag

- Checks: CHK-119, CHK-198, CHK-200
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts` (`flags capacity exceeded when three doubles overlap`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts -t "flags capacity exceeded when three doubles overlap"
```

- Expected artifacts/assertions: test passes; verifier emits `PERSON_RUN_CAPACITY_EXCEEDED`, report invalid for critical issue.

## Case 14 - Mixed Single+Double Blocked

- Checks: CHK-120
- Required input: in-test fixture in `app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts` (`treats mixed single+double overlap as blocked`)
- Command:

```bash
npx jest --runInBand app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts -t "treats mixed single+double overlap as blocked"
```

- Expected artifacts/assertions: test passes; any overlap where either run is single is blocked.

## Case 15 - Breakdown Mid-Run Pause

- Checks: CHK-121, CHK-190
- Required input: `tests/fixtures/chk_101_200/chk121_breakdown_mid_run.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk121_breakdown_mid_run.json --out-dir out/chk101_200/case15
python3 -c "import csv,datetime as dt; r=list(csv.DictReader(open('out/chk101_200/case15/operation_summary.csv')))[0]; rs=dt.datetime.strptime(r['RunStart'],'%Y-%m-%d %H:%M'); re=dt.datetime.strptime(r['RunEnd'],'%Y-%m-%d %H:%M'); assert int((re-rs).total_seconds()//60) > 120; print('OK case15')"
```

- Expected artifacts/assertions: run wall-clock duration exceeds active cycle time due to breakdown interruption.

## Case 16 - Overnight Setup Window

- Checks: CHK-125, CHK-169
- Required input: `tests/fixtures/chk_101_200/chk125_overnight_setup_window.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk125_overnight_setup_window.json --out-dir out/chk101_200/case16
python3 -c "import csv,datetime as dt; r=list(csv.DictReader(open('out/chk101_200/case16/operation_summary.csv')))[0]; s=dt.datetime.strptime(r['SetupStart'],'%Y-%m-%d %H:%M'); e=dt.datetime.strptime(r['SetupEnd'],'%Y-%m-%d %H:%M'); assert e.date()>=s.date(); assert e>s; print('OK case16')"
```

- Expected artifacts/assertions: setup is scheduled through overnight window and remains monotonic.

## Case 17 - Overnight Production Window

- Checks: CHK-126, CHK-192
- Required input: `tests/fixtures/chk_101_200/chk126_overnight_production_window.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk126_overnight_production_window.json --out-dir out/chk101_200/case17
python3 -c "import csv,datetime as dt; r=list(csv.DictReader(open('out/chk101_200/case17/operation_summary.csv')))[0]; rs=dt.datetime.strptime(r['RunStart'],'%Y-%m-%d %H:%M'); re=dt.datetime.strptime(r['RunEnd'],'%Y-%m-%d %H:%M'); assert re.date()>rs.date(); print('OK case17')"
```

- Expected artifacts/assertions: run crosses midnight and remains valid.

## Case 18 - Piece Timeline Integrity (Count, Precedence, Multi-Batch)

- Checks: CHK-151, CHK-152, CHK-155, CHK-158, CHK-159, CHK-160, CHK-161, CHK-164, CHK-165, CHK-166, CHK-168, CHK-183, CHK-184, CHK-185, CHK-193, CHK-194
- Required inputs:
  - `tests/fixtures/chk_101_200/chk151_piece_count_precedence.json`
  - `tests/fixtures/chk_101_200/chk193_multi_batch_shared_machine.json`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk151_piece_count_precedence.json --out-dir out/chk101_200/case18a
python3 scripts/piece_level_verifier.py --input tests/fixtures/chk_101_200/chk193_multi_batch_shared_machine.json --out-dir out/chk101_200/case18b
python3 - <<'PY'
import csv
from datetime import datetime

rows = list(csv.DictReader(open('out/chk101_200/case18a/piece_timeline.csv')))
assert len(rows) == 6
assert set(rows[0].keys()) == {
    'PartNumber','Batch_ID','Piece','OperationSeq','OperationName','Machine','Operator',
    'ArrivalFromPrevOp','RunStart','RunEnd','WaitMin'
}

by_piece = {}
for r in rows:
    by_piece.setdefault((r['PartNumber'], r['Batch_ID'], r['Piece']), []).append(r)

for _, chain in by_piece.items():
    chain.sort(key=lambda x: int(x['OperationSeq']))
    assert [int(x['OperationSeq']) for x in chain] == sorted(int(x['OperationSeq']) for x in chain)
    for i in range(1, len(chain)):
        prev_end = datetime.strptime(chain[i-1]['RunEnd'], '%Y-%m-%d %H:%M')
        curr_start = datetime.strptime(chain[i]['RunStart'], '%Y-%m-%d %H:%M')
        assert curr_start >= prev_end

rows_b = list(csv.DictReader(open('out/chk101_200/case18b/piece_timeline.csv')))
assert set(r['Batch_ID'] for r in rows_b) == {'B01', 'B02'}
print('OK case18')
PY
```

- Expected artifacts/assertions: stable CSV schema, row count formula holds, per-piece precedence holds, no dropped/phantom pieces, multi-batch IDs preserved with shared-machine schedule remaining valid.

## Optional Add-On (Live Replay + Lane Views)

- Checks: CHK-173, CHK-174, CHK-175, CHK-179, CHK-180, CHK-181, CHK-182, CHK-186
- Required input: built-in demo `batch3`
- Commands:

```bash
python3 scripts/piece_level_verifier.py --demo batch3 --lane-mode operation --live --live-delay 0 --live-pieces 2 --live-operations 1,2,3 --live-machines "VMC 1,VMC 2,VMC 3" --out-dir out/chk101_200/live_lane
python3 -c "import os; assert os.path.exists('out/chk101_200/live_lane/piece_flow.html'); assert os.path.exists('out/chk101_200/live_lane/piece_flow_map.html'); print('OK live_lane')"
```

- Expected artifacts/assertions: replay executes with zero delay; lane-mode output files generated; filters applied by CLI arguments.
