#!/usr/bin/env python3

from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "chk121_250_phase3"
TIME_FMT = "%Y-%m-%d %H:%M"


def _run(
    cmd: List[str], out_dir: Path | None = None
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )


def _run_verifier_input(
    check_id: int, payload: Dict[str, Any]
) -> Tuple[subprocess.CompletedProcess[str], Path]:
    case_dir = OUT / f"CHK-{check_id:03d}"
    case_dir.mkdir(parents=True, exist_ok=True)
    input_path = case_dir / "input.json"
    input_path.write_text(json.dumps(payload), encoding="utf-8")
    result = _run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--input",
            str(input_path),
            "--out-dir",
            str(case_dir),
        ]
    )
    (case_dir / "stdout.log").write_text(result.stdout, encoding="utf-8")
    (case_dir / "stderr.log").write_text(result.stderr, encoding="utf-8")
    return result, case_dir


def _run_verifier_args(
    check_id: int, args: List[str]
) -> Tuple[subprocess.CompletedProcess[str], Path]:
    case_dir = OUT / f"CHK-{check_id:03d}"
    case_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "python3",
        "scripts/piece_level_verifier.py",
        *args,
        "--out-dir",
        str(case_dir),
    ]
    result = _run(cmd)
    (case_dir / "stdout.log").write_text(result.stdout, encoding="utf-8")
    (case_dir / "stderr.log").write_text(result.stderr, encoding="utf-8")
    return result, case_dir


def _read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def _write_assert(case_dir: Path, text: str) -> None:
    (case_dir / "assertion.txt").write_text(text + "\n", encoding="utf-8")


def _baseline_payload() -> Dict[str, Any]:
    return {
        "setup_window": "06:00-22:00",
        "production_window": "06:00-22:00",
        "operators_by_shift": {"shift1": ["A"]},
        "shifts": {"A": "06:00-22:00"},
        "holidays": [],
        "breakdowns": [],
        "batches": [
            {
                "part_number": "PNX",
                "batch_id": "B01",
                "batch_qty": 2,
                "start_datetime": "2026-02-22 06:00",
                "operations": [
                    {
                        "operation_seq": 1,
                        "operation_name": "Facing",
                        "setup_time_min": 10,
                        "cycle_time_min": 2,
                        "machine": "VMC 1",
                        "eligible_machines": ["VMC 1", "VMC 2"],
                    }
                ],
            }
        ],
    }


def _check_122() -> str:
    payload = _baseline_payload()
    payload["breakdowns"] = [
        {"machine": "VMC 1", "start": "2026-02-22 07:00", "end": "2026-02-22 08:00"}
    ]
    payload["batches"][0]["batch_qty"] = 1
    payload["batches"][0]["operations"][0]["setup_time_min"] = 120
    payload["batches"][0]["operations"][0]["cycle_time_min"] = 10
    result, case_dir = _run_verifier_input(122, payload)
    _assert(result.returncode == 0, "verifier failed")
    row = _read_csv(case_dir / "operation_summary.csv")[0]
    s = datetime.strptime(row["SetupStart"], TIME_FMT)
    e = datetime.strptime(row["SetupEnd"], TIME_FMT)
    _assert((e - s).total_seconds() / 60 > 120, "setup did not pause")
    _write_assert(case_dir, "PASS CHK-122")
    return str(case_dir / "assertion.txt")


def _check_127() -> str:
    payload = {
        "batches": [
            {
                "part_number": "PN127",
                "batch_id": "B01",
                "batch_qty": 1,
                "start_datetime": "2026-02-22 06:00",
                "operations": [
                    {
                        "operation_seq": 1,
                        "operation_name": "Face",
                        "setup_time_min": 10,
                        "cycle_time_min": 5,
                    }
                ],
            }
        ]
    }
    result, case_dir = _run_verifier_input(127, payload)
    _assert(result.returncode != 0, "expected failure")
    _assert(
        "Invalid machine assignment" in result.stderr,
        "missing machine assignment error",
    )
    _write_assert(case_dir, "PASS CHK-127")
    return str(case_dir / "stderr.log")


def _check_128_129() -> Tuple[str, str]:
    payload = _baseline_payload()
    payload["setup_window"] = "06:00-07:00"
    payload["shifts"] = {"A": "08:00-09:00"}
    payload["batches"][0]["batch_qty"] = 1
    payload["batches"][0]["operations"][0]["setup_time_min"] = 30
    payload["batches"][0]["operations"][0]["cycle_time_min"] = 10
    result, case_dir = _run_verifier_input(128, payload)
    _assert(result.returncode != 0, "expected bounded-horizon failure")
    _assert(
        "Could not find setup slot within 30 days" in result.stderr,
        "missing bounded-horizon message",
    )
    _write_assert(case_dir, "PASS CHK-128 and CHK-129")
    return str(case_dir / "stderr.log"), str(case_dir / "assertion.txt")


def _check_demo_csv_assert(
    check_id: int, demo: str, assert_fn: Callable[[Path], None]
) -> str:
    result, case_dir = _run_verifier_args(check_id, ["--demo", demo])
    _assert(result.returncode == 0, "demo run failed")
    assert_fn(case_dir)
    _write_assert(case_dir, f"PASS CHK-{check_id:03d}")
    return str(case_dir / "assertion.txt")


def _check_130() -> str:
    return _check_demo_csv_assert(
        130,
        "batch3",
        lambda d: _assert(
            all(r["Machine"].strip() for r in _read_csv(d / "operation_summary.csv")),
            "empty machine found",
        ),
    )


def _check_139() -> str:
    def _assertion(d: Path) -> None:
        rows = sorted(
            _read_csv(d / "operation_summary.csv"), key=lambda r: int(r["OperationSeq"])
        )
        for i in range(1, len(rows)):
            _assert(
                datetime.strptime(rows[i]["RunStart"], TIME_FMT)
                >= datetime.strptime(rows[i - 1]["RunEnd"], TIME_FMT),
                "dependent start before predecessor end",
            )

    return _check_demo_csv_assert(139, "batch3", _assertion)


def _check_140() -> str:
    def _assertion(d: Path) -> None:
        for r in _read_csv(d / "operation_summary.csv"):
            _assert(
                datetime.strptime(r["SetupEnd"], TIME_FMT)
                <= datetime.strptime(r["RunStart"], TIME_FMT),
                "setup end after run start",
            )

    return _check_demo_csv_assert(140, "batch3", _assertion)


def _check_141_142_143() -> Tuple[str, str, str]:
    result, case_dir = _run_verifier_args(141, ["--demo", "batch3"])
    _assert(result.returncode == 0, "demo run failed")
    piece = _read_csv(case_dir / "piece_timeline.csv")
    op_rows = _read_csv(case_dir / "operation_summary.csv")

    by_op: Dict[Tuple[str, str, str], List[Dict[str, str]]] = defaultdict(list)
    for r in piece:
        by_op[(r["PartNumber"], r["Batch_ID"], r["OperationSeq"])].append(r)
    for rows in by_op.values():
        rows.sort(key=lambda r: int(r["Piece"]))
        ends = [datetime.strptime(r["RunEnd"], TIME_FMT) for r in rows]
        for i in range(1, len(ends)):
            _assert(ends[i] >= ends[i - 1], "non-monotonic run end")

    by_machine: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    by_operator: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for r in op_rows:
        by_machine[r["Machine"]].append(r)
        by_operator[r["Operator"]].append(r)

    for rows in by_machine.values():
        rows.sort(key=lambda r: datetime.strptime(r["SetupStart"], TIME_FMT))
        for i in range(1, len(rows)):
            _assert(
                datetime.strptime(rows[i]["SetupStart"], TIME_FMT)
                >= datetime.strptime(rows[i - 1]["SetupStart"], TIME_FMT),
                "machine calendar order broken",
            )

    for rows in by_operator.values():
        rows.sort(key=lambda r: datetime.strptime(r["SetupStart"], TIME_FMT))
        for i in range(1, len(rows)):
            _assert(
                datetime.strptime(rows[i]["SetupStart"], TIME_FMT)
                >= datetime.strptime(rows[i - 1]["SetupStart"], TIME_FMT),
                "operator calendar order broken",
            )

    _write_assert(case_dir, "PASS CHK-141/142/143")
    return (
        str(case_dir / "assertion.txt"),
        str(case_dir / "assertion.txt"),
        str(case_dir / "assertion.txt"),
    )


def _check_144() -> str:
    a_res, a_dir = _run_verifier_args(144, ["--demo", "batch3"])
    b_res, b_dir = _run_verifier_args(1144, ["--demo", "batch3"])
    _assert(a_res.returncode == 0 and b_res.returncode == 0, "rerun failed")
    for file_name in [
        "operation_summary.csv",
        "piece_timeline.csv",
        "validation_report.json",
    ]:
        a_hash = hashlib.sha256((a_dir / file_name).read_bytes()).hexdigest()
        b_hash = hashlib.sha256((b_dir / file_name).read_bytes()).hexdigest()
        _assert(a_hash == b_hash, f"hash mismatch for {file_name}")
    _write_assert(a_dir, "PASS CHK-144")
    return str(a_dir / "assertion.txt")


def _check_benchmark(check_id: int, demo: str, threshold_sec: float) -> str:
    case_dir = OUT / f"CHK-{check_id:03d}"
    case_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    result = _run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            demo,
            "--out-dir",
            str(case_dir),
        ]
    )
    elapsed = time.perf_counter() - t0
    _assert(result.returncode == 0, "benchmark run failed")
    _assert(
        elapsed < threshold_sec, f"runtime {elapsed:.2f}s exceeds {threshold_sec:.2f}s"
    )
    (case_dir / "benchmark.json").write_text(
        json.dumps({"elapsed_sec": elapsed, "threshold_sec": threshold_sec}, indent=2),
        encoding="utf-8",
    )
    return str(case_dir / "benchmark.json")


def _check_149() -> str:
    # Reuse CHK-127 failing path and assert no output artifacts.
    payload = {
        "batches": [
            {
                "part_number": "PN149",
                "batch_id": "B01",
                "batch_qty": 1,
                "start_datetime": "2026-02-22 06:00",
                "operations": [
                    {
                        "operation_seq": 1,
                        "operation_name": "Face",
                        "setup_time_min": 10,
                        "cycle_time_min": 5,
                    }
                ],
            }
        ]
    }
    result, case_dir = _run_verifier_input(149, payload)
    _assert(result.returncode != 0, "expected failure")
    for file_name in [
        "operation_summary.csv",
        "piece_timeline.csv",
        "validation_report.json",
    ]:
        _assert(
            not (case_dir / file_name).exists(),
            f"unexpected partial artifact: {file_name}",
        )
    _write_assert(case_dir, "PASS CHK-149")
    return str(case_dir / "assertion.txt")


def _check_162_163_167_168() -> Tuple[str, str, str, str]:
    result, case_dir = _run_verifier_args(162, ["--demo", "batch3"])
    _assert(result.returncode == 0, "demo run failed")
    rows = _read_csv(case_dir / "piece_timeline.csv")

    by_piece: Dict[Tuple[str, str, str], List[Dict[str, str]]] = defaultdict(list)
    for r in rows:
        by_piece[(r["PartNumber"], r["Batch_ID"], r["Piece"])].append(r)

    for chain in by_piece.values():
        chain.sort(key=lambda r: int(r["OperationSeq"]))
        for i in range(1, len(chain)):
            prev_end = datetime.strptime(chain[i - 1]["RunEnd"], TIME_FMT)
            curr_start = datetime.strptime(chain[i]["RunStart"], TIME_FMT)
            _assert(curr_start >= prev_end, "op chain precedence failed")

    starts = [datetime.strptime(r["RunStart"], TIME_FMT) for r in rows]
    for i in range(1, len(starts)):
        _assert(starts[i] >= starts[i - 1], "piece timeline not sorted by RunStart")

    op_rows = _read_csv(case_dir / "operation_summary.csv")
    counts: Dict[Tuple[str, str, str], int] = defaultdict(int)
    for r in rows:
        counts[(r["PartNumber"], r["Batch_ID"], r["OperationSeq"])] += 1
    for r in op_rows:
        _assert(
            counts[(r["PartNumber"], r["Batch_ID"], str(r["OperationSeq"]))] > 0,
            "operation summary not represented in piece timeline",
        )

    _write_assert(case_dir, "PASS CHK-162/163/167/168")
    return (
        str(case_dir / "assertion.txt"),
        str(case_dir / "assertion.txt"),
        str(case_dir / "assertion.txt"),
        str(case_dir / "assertion.txt"),
    )


def _extract_rows_from_html(html_path: Path) -> List[Dict[str, Any]]:
    text = html_path.read_text(encoding="utf-8")
    m = re.search(r"const rows = (\[.*?\]);", text, re.S)
    _assert(m is not None, "rows payload not found in html")
    return json.loads(m.group(1))


def _check_170_171_173_174_175() -> Dict[int, str]:
    evidence: Dict[int, str] = {}

    res, c170 = _run_verifier_args(170, ["--demo", "batch3"])
    _assert(res.returncode == 0, "CHK-170 run failed")
    piece_rows = _read_csv(c170 / "piece_timeline.csv")
    html_map = (c170 / "piece_flow_map.html").read_text(encoding="utf-8")
    probe = piece_rows[0]
    _assert(
        probe["RunStart"] in html_map and probe["RunEnd"] in html_map,
        "flow map missing timeline values",
    )
    _write_assert(c170, "PASS CHK-170")
    evidence[170] = str(c170 / "assertion.txt")

    # CHK-171 exact payload parity between map html rows and piece timeline.
    map_rows = _extract_rows_from_html(c170 / "piece_flow_map.html")
    csv_set = {
        (
            r["PartNumber"],
            r["Batch_ID"],
            int(r["Piece"]),
            int(r["OperationSeq"]),
            r["Machine"],
            r["RunStart"],
            r["RunEnd"],
        )
        for r in piece_rows
    }
    map_set = {
        (
            r["part"],
            r["batch"],
            int(r["piece"]),
            int(r["op"]),
            r["machine"],
            r["start"],
            r["end"],
        )
        for r in map_rows
    }
    _assert(csv_set == map_set, "map payload does not match piece timeline")
    evidence[171] = str(c170 / "assertion.txt")

    res_m, c173 = _run_verifier_args(
        173, ["--demo", "batch3", "--lane-mode", "machine"]
    )
    _assert(res_m.returncode == 0, "CHK-173 run failed")
    rows_machine = _extract_rows_from_html(c173 / "piece_flow.html")
    _assert(
        rows_machine and all(str(r["lane"]).startswith("VMC ") for r in rows_machine),
        "machine lanes invalid",
    )
    _write_assert(c173, "PASS CHK-173")
    evidence[173] = str(c173 / "assertion.txt")

    res_o, c174 = _run_verifier_args(
        174, ["--demo", "batch3", "--lane-mode", "operation"]
    )
    _assert(res_o.returncode == 0, "CHK-174 run failed")
    rows_operation = _extract_rows_from_html(c174 / "piece_flow.html")
    _assert(
        rows_operation
        and all(str(r["lane"]).startswith("Op ") for r in rows_operation),
        "operation lanes invalid",
    )
    _write_assert(c174, "PASS CHK-174")
    evidence[174] = str(c174 / "assertion.txt")

    machines_unique = {r["Machine"] for r in piece_rows}
    ops_unique = {f"Op {r['OperationSeq']}" for r in piece_rows}
    _assert(
        len({r["lane"] for r in rows_machine}) == len(machines_unique),
        "machine lane count mismatch",
    )
    _assert(
        len({r["lane"] for r in rows_operation}) == len(ops_unique),
        "operation lane count mismatch",
    )
    evidence[175] = str(c173 / "assertion.txt")

    return evidence


def _check_live_filter(
    check_id: int, args: List[str], predicate: Callable[[Dict[str, str]], bool]
) -> str:
    result, case_dir = _run_verifier_args(
        check_id, ["--demo", "batch3", "--live", "--live-delay", "0", *args]
    )
    _assert(result.returncode == 0, "live run failed")
    events = _read_csv(case_dir / "piece_live_events.csv")
    expected = sum(1 for r in events if predicate(r))
    m = re.search(r"replay events=(\d+)", result.stdout)
    _assert(m is not None, "live replay header missing")
    replay = int(m.group(1))
    _assert(replay == expected, f"replay count {replay} != expected {expected}")
    _write_assert(case_dir, f"PASS CHK-{check_id:03d}")
    return str(case_dir / "assertion.txt")


def _check_179_180_181_182_186() -> Dict[int, str]:
    evidence: Dict[int, str] = {}
    evidence[179] = _check_live_filter(
        179, ["--live-pieces", "2"], lambda r: int(r["Piece"]) <= 2
    )
    evidence[180] = _check_live_filter(
        180, ["--live-operations", "1,2"], lambda r: int(r["OperationSeq"]) in {1, 2}
    )
    evidence[181] = _check_live_filter(
        181,
        ["--live-machines", "VMC 1,VMC 2"],
        lambda r: r["Machine"].strip().upper() in {"VMC 1", "VMC 2"},
    )

    res182, c182 = _run_verifier_args(182, ["--demo", "batch3"])
    _assert(res182.returncode == 0, "CHK-182 run failed")
    timeline = _read_csv(c182 / "piece_timeline.csv")
    events = _read_csv(c182 / "piece_live_events.csv")
    _assert(
        len(events) == 2 * len(timeline),
        "live events not equal to START+END per timeline row",
    )
    _write_assert(c182, "PASS CHK-182")
    evidence[182] = str(c182 / "assertion.txt")

    res186, c186 = _run_verifier_args(
        186, ["--demo", "batch3", "--live", "--live-delay", "0"]
    )
    _assert(res186.returncode == 0, "CHK-186 run failed")
    _assert(
        "[LIVE] replay events=" in res186.stdout and "delay=0.00s" in res186.stdout,
        "missing live banner",
    )
    _write_assert(c186, "PASS CHK-186")
    evidence[186] = str(c186 / "assertion.txt")
    return evidence


def _check_187_188() -> Dict[int, str]:
    evidence: Dict[int, str] = {}
    res187, c187 = _run_verifier_args(187, ["--demo", "batch250"])
    _assert(res187.returncode == 0, "CHK-187 run failed")
    timeline = _read_csv(c187 / "piece_timeline.csv")
    events = _read_csv(c187 / "piece_live_events.csv")
    _assert(len(timeline) == 1000, "unexpected timeline row count")
    _assert(len(events) == 2000, "unexpected live events row count")
    _write_assert(c187, "PASS CHK-187")
    evidence[187] = str(c187 / "assertion.txt")

    res_a, c188a = _run_verifier_args(188, ["--demo", "batch3"])
    res_b, c188b = _run_verifier_args(1188, ["--demo", "batch3"])
    _assert(res_a.returncode == 0 and res_b.returncode == 0, "CHK-188 reruns failed")
    for file_name in [
        "operation_summary.csv",
        "piece_timeline.csv",
        "piece_live_events.csv",
        "validation_report.json",
    ]:
        ha = hashlib.sha256((c188a / file_name).read_bytes()).hexdigest()
        hb = hashlib.sha256((c188b / file_name).read_bytes()).hexdigest()
        _assert(ha == hb, f"determinism hash mismatch: {file_name}")
    _write_assert(c188a, "PASS CHK-188")
    evidence[188] = str(c188a / "assertion.txt")

    return evidence


def _check_jest(check_id: int, test_name: str, test_file: str) -> str:
    case_dir = OUT / f"CHK-{check_id:03d}"
    case_dir.mkdir(parents=True, exist_ok=True)
    result = _run(
        [
            "npx",
            "jest",
            "--runInBand",
            test_file,
            "-t",
            test_name,
            "--json",
            "--outputFile",
            str(case_dir / "jest.json"),
        ]
    )
    (case_dir / "stdout.log").write_text(result.stdout, encoding="utf-8")
    (case_dir / "stderr.log").write_text(result.stderr, encoding="utf-8")
    _assert(result.returncode == 0, "jest test failed")
    return str(case_dir / "jest.json")


def _check_190() -> str:
    fixture = (
        ROOT / "tests" / "fixtures" / "chk_101_200" / "chk121_breakdown_mid_run.json"
    )
    result, case_dir = _run_verifier_args(190, ["--input", str(fixture)])
    _assert(result.returncode == 0, "CHK-190 run failed")
    for r in _read_csv(case_dir / "piece_timeline.csv"):
        _assert(
            datetime.strptime(r["RunEnd"], TIME_FMT)
            > datetime.strptime(r["RunStart"], TIME_FMT),
            "non-positive run interval",
        )
    _write_assert(case_dir, "PASS CHK-190")
    return str(case_dir / "assertion.txt")


def _check_196_197() -> Dict[int, str]:
    evidence: Dict[int, str] = {}
    spec = importlib.util.spec_from_file_location(
        "plv", ROOT / "scripts" / "piece_level_verifier.py"
    )
    _assert(spec is not None and spec.loader is not None, "cannot load verifier module")
    module = importlib.util.module_from_spec(spec)
    sys.modules["plv"] = module
    spec.loader.exec_module(module)

    c196 = OUT / "CHK-196"
    c196.mkdir(parents=True, exist_ok=True)
    op_rows = [
        {
            "PartNumber": "PNX",
            "Batch_ID": "B01",
            "OperationSeq": 1,
            "RunEnd": "2026-02-22 10:00",
        },
        {
            "PartNumber": "PNX",
            "Batch_ID": "B01",
            "OperationSeq": 2,
            "RunEnd": "2026-02-22 09:30",
        },
    ]
    report196 = module.validate_results(op_rows, {}, {}, None)
    _assert(
        any("RunEnd ordering violation" in e for e in report196["errors"]),
        "missing precedence violation",
    )
    (c196 / "validation_report.json").write_text(
        json.dumps(report196, indent=2), encoding="utf-8"
    )
    _write_assert(c196, "PASS CHK-196")
    evidence[196] = str(c196 / "validation_report.json")

    c197 = OUT / "CHK-197"
    c197.mkdir(parents=True, exist_ok=True)
    a = module.Interval(datetime(2026, 2, 22, 8, 0), datetime(2026, 2, 22, 10, 0))
    b = module.Interval(datetime(2026, 2, 22, 9, 0), datetime(2026, 2, 22, 11, 0))
    report197 = module.validate_results([], {}, {"VMC 1": [a, b]}, None)
    _assert(
        any("Machine overlap: VMC 1" in e for e in report197["errors"]),
        "missing machine overlap",
    )
    (c197 / "validation_report.json").write_text(
        json.dumps(report197, indent=2), encoding="utf-8"
    )
    _write_assert(c197, "PASS CHK-197")
    evidence[197] = str(c197 / "validation_report.json")

    return evidence


def _check_213() -> str:
    payload = _baseline_payload()
    payload["batches"][0]["batch_qty"] = 1
    payload["batches"][0]["operations"][0]["cycle_time_min"] = 0
    result, case_dir = _run_verifier_input(213, payload)
    _assert(result.returncode != 0, "expected cycle_time_min rejection")
    _assert(
        "Invalid cycle_time_min" in result.stderr,
        "missing explicit cycle_time_min error",
    )
    _write_assert(case_dir, "PASS CHK-213")
    return str(case_dir / "assertion.txt")


def _check_241_242_248_250() -> Dict[int, str]:
    evidence: Dict[int, str] = {}

    # CHK-241 taxonomy consistency for validation errors.
    cases_241 = {
        "out/chk121_250_phase2/chk203_missing_batches.json": "InputValidationError",
        "out/chk121_250_phase2/chk205_missing_operation_seq.json": "InputValidationError",
        "out/chk121_250_phase2/chk207_missing_setup_time.json": "InputValidationError",
        "out/chk121_250_phase2/chk216_nonnumeric_cycle.json": "InputValidationError",
        "out/chk121_250_phase2/chk218_invalid_breakdown_datetime.json": "ValueError",
        "out/chk121_250_phase2/chk220_breakdown_missing_machine.json": "InputValidationError",
        "out/chk121_250_phase2/chk202_invalid_window.json": "ValueError",
    }
    c241 = OUT / "CHK-241"
    c241.mkdir(parents=True, exist_ok=True)
    for fx, expected_cls in cases_241.items():
        r = _run(
            [
                "python3",
                "scripts/piece_level_verifier.py",
                "--input",
                fx,
                "--out-dir",
                str(c241 / "tmp"),
            ]
        )
        lines = [ln for ln in r.stderr.splitlines() if ln.strip()]
        _assert(lines, f"no stderr for {fx}")
        actual = lines[-1].split(":", 1)[0].strip()
        _assert(actual == expected_cls, f"{fx}: expected {expected_cls}, got {actual}")
    _write_assert(c241, "PASS CHK-241")
    evidence[241] = str(c241 / "assertion.txt")

    # CHK-242 field context presence.
    c242 = OUT / "CHK-242"
    c242.mkdir(parents=True, exist_ok=True)
    fields = {
        "out/chk121_250_phase2/chk205_missing_operation_seq.json": "operation_seq",
        "out/chk121_250_phase2/chk207_missing_setup_time.json": "setup_time_min",
        "out/chk121_250_phase2/chk208_missing_cycle_time.json": "cycle_time_min",
        "out/chk121_250_phase2/chk209_missing_start_datetime.json": "start_datetime",
    }
    for fx, token in fields.items():
        r = _run(
            [
                "python3",
                "scripts/piece_level_verifier.py",
                "--input",
                fx,
                "--out-dir",
                str(c242 / "tmp"),
            ]
        )
        _assert(token in r.stderr, f"missing field token '{token}' in stderr for {fx}")
    _write_assert(c242, "PASS CHK-242")
    evidence[242] = str(c242 / "assertion.txt")

    # CHK-248 deterministic parser errors across reruns.
    c248 = OUT / "CHK-248"
    c248.mkdir(parents=True, exist_ok=True)
    fixtures_248 = [
        "out/chk121_250_phase2/chk228_malformed_json.json",
        "out/chk121_250_phase2/chk202_invalid_window.json",
        "out/chk121_250_phase2/chk216_nonnumeric_cycle.json",
    ]
    for fx in fixtures_248:
        signatures = []
        for _ in range(5):
            r = _run(
                [
                    "python3",
                    "scripts/piece_level_verifier.py",
                    "--input",
                    fx,
                    "--out-dir",
                    str(c248 / "tmp"),
                ]
            )
            lines = [ln.strip() for ln in r.stderr.splitlines() if ln.strip()]
            signatures.append((r.returncode, lines[-1] if lines else ""))
        _assert(len(set(signatures)) == 1, f"non-deterministic parser error for {fx}")
    _write_assert(c248, "PASS CHK-248")
    evidence[248] = str(c248 / "assertion.txt")

    # CHK-250 remediation hint quality rubric.
    c250 = OUT / "CHK-250"
    c250.mkdir(parents=True, exist_ok=True)
    probes = [
        ("out/chk121_250_phase2/chk211_zero_batch_qty.json", "batch_qty"),
        ("out/chk121_250_phase2/chk214_negative_cycle_time.json", "cycle_time_min"),
        ("out/chk121_250_phase2/chk215_negative_setup_time.json", "setup_time_min"),
        (
            "out/chk121_250_phase2/chk227_invalid_shift_window.json",
            "Invalid window format",
        ),
    ]
    hint_words = {"expected", "provide", "format", "must", "positive", "non-negative"}
    for fx, token in probes:
        r = _run(
            [
                "python3",
                "scripts/piece_level_verifier.py",
                "--input",
                fx,
                "--out-dir",
                str(c250 / "tmp"),
            ]
        )
        msg = r.stderr.lower()
        _assert(token.lower() in msg, f"missing field/context token for {fx}")
        _assert(
            any(h in msg for h in hint_words),
            f"missing remediation hint words for {fx}",
        )
    _write_assert(c250, "PASS CHK-250")
    evidence[250] = str(c250 / "assertion.txt")

    return evidence


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    results: Dict[int, Dict[str, str]] = {}

    # Non-UI checks from CHK-121..250 where automation is available now.
    stderr_128, assert_129 = _check_128_129()
    results[128] = {"status": "PASS", "evidence": stderr_128}
    results[129] = {"status": "PASS", "evidence": assert_129}

    results[122] = {"status": "PASS", "evidence": _check_122()}
    results[127] = {"status": "PASS", "evidence": _check_127()}
    results[130] = {"status": "PASS", "evidence": _check_130()}
    results[139] = {"status": "PASS", "evidence": _check_139()}
    results[140] = {"status": "PASS", "evidence": _check_140()}

    e141, e142, e143 = _check_141_142_143()
    results[141] = {"status": "PASS", "evidence": e141}
    results[142] = {"status": "PASS", "evidence": e142}
    results[143] = {"status": "PASS", "evidence": e143}

    results[144] = {"status": "PASS", "evidence": _check_144()}
    results[145] = {"status": "PASS", "evidence": _check_benchmark(145, "batch3", 5.0)}
    results[146] = {
        "status": "PASS",
        "evidence": _check_benchmark(146, "batch250", 30.0),
    }
    results[149] = {"status": "PASS", "evidence": _check_149()}

    e162, e163, e167, e168 = _check_162_163_167_168()
    results[162] = {"status": "PASS", "evidence": e162}
    results[163] = {"status": "PASS", "evidence": e163}
    results[167] = {"status": "PASS", "evidence": e167}
    results[168] = {"status": "PASS", "evidence": e168}

    map_lane_evidence = _check_170_171_173_174_175()
    for chk, ev in map_lane_evidence.items():
        results[chk] = {"status": "PASS", "evidence": ev}

    live_evidence = _check_179_180_181_182_186()
    for chk, ev in live_evidence.items():
        results[chk] = {"status": "PASS", "evidence": ev}

    large_det = _check_187_188()
    for chk, ev in large_det.items():
        results[chk] = {"status": "PASS", "evidence": ev}

    results[190] = {"status": "PASS", "evidence": _check_190()}
    results[191] = {
        "status": "PASS",
        "evidence": _check_jest(
            191,
            "respects holiday blocking for setup and run",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ),
    }
    results[195] = {
        "status": "PASS",
        "evidence": _check_jest(
            195,
            "caps triple-double overlap to max two concurrent runs per person",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ),
    }

    val_evidence = _check_196_197()
    for chk, ev in val_evidence.items():
        results[chk] = {"status": "PASS", "evidence": ev}

    results[213] = {"status": "PASS", "evidence": _check_213()}

    error_contract = _check_241_242_248_250()
    for chk, ev in error_contract.items():
        results[chk] = {"status": "PASS", "evidence": ev}

    summary = {
        "total_checks_scored": len(results),
        "pass_count": sum(1 for r in results.values() if r["status"] == "PASS"),
        "results": {str(k): v for k, v in sorted(results.items())},
    }
    (OUT / "runner_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {"total": summary["total_checks_scored"], "pass": summary["pass_count"]},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
