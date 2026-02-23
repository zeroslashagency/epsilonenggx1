#!/usr/bin/env python3
"""
Conflict-focused test harness for piece-level scheduling.

This suite checks the requested conflict classes:
- MACHINE_CONFLICT
- PERSON_CONFLICT
- PN_CONFLICT (aka "PEN conflict")
- HOLIDAY_CONFLICT
- MACHINE_AVAILABILITY_CONFLICT

Usage:
  python3 scripts/piece_conflict_suite.py \
    --manifest scripts/testcases/piece_conflicts/manifest.json \
    --out-dir out/piece_conflict_suite
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.piece_level_verifier import load_input, parse_dt, run_piece_level_schedule


CONFLICT_CODES: Tuple[str, ...] = (
    "MACHINE_CONFLICT",
    "PERSON_CONFLICT",
    "PN_CONFLICT",
    "HOLIDAY_CONFLICT",
    "MACHINE_AVAILABILITY_CONFLICT",
)


@dataclass(frozen=True)
class Conflict:
    code: str
    entity_ref: str
    message: str


def parse_holiday_dates(raw_holidays: Sequence[str]) -> Set[date]:
    out: Set[date] = set()
    for item in raw_holidays:
        if len(item) == 10:
            out.add(datetime.strptime(item, "%Y-%m-%d").date())
        else:
            out.add(parse_dt(item).date())
    return out


def interval_overlap(
    left: Tuple[datetime, datetime], right: Tuple[datetime, datetime]
) -> bool:
    return left[0] < right[1] and right[0] < left[1]


def interval_hits_holiday(
    start: datetime, end: datetime, holiday_dates: Set[date]
) -> bool:
    day = start.date()
    end_day = end.date()
    while day <= end_day:
        if day in holiday_dates:
            day_start = datetime.combine(day, time.min)
            day_end = day_start + timedelta(days=1)
            if start < day_end and end > day_start:
                return True
        day += timedelta(days=1)
    return False


def check_machine_conflict(op_rows: Sequence[Dict[str, Any]]) -> List[Conflict]:
    grouped: Dict[str, List[Tuple[datetime, datetime, str]]] = {}
    for row in op_rows:
        machine = str(row.get("Machine", "")).strip()
        if not machine:
            continue
        start = parse_dt(str(row["SetupStart"]))
        end = parse_dt(str(row["RunEnd"]))
        entity = (
            f"{row['PartNumber']}/{row['Batch_ID']}/OP{row['OperationSeq']}"
        )
        grouped.setdefault(machine, []).append((start, end, entity))

    conflicts: List[Conflict] = []
    for machine, windows in grouped.items():
        windows.sort(key=lambda x: x[0])
        for idx in range(1, len(windows)):
            prev = windows[idx - 1]
            curr = windows[idx]
            if interval_overlap((prev[0], prev[1]), (curr[0], curr[1])):
                conflicts.append(
                    Conflict(
                        code="MACHINE_CONFLICT",
                        entity_ref=f"{machine}",
                        message=(
                            f"Overlap between {prev[2]} and {curr[2]} at "
                            f"{curr[0].strftime('%Y-%m-%d %H:%M')}"
                        ),
                    )
                )
    return conflicts


def check_person_conflict(
    op_rows: Sequence[Dict[str, Any]], mode: str
) -> List[Conflict]:
    grouped_setup: Dict[str, List[Tuple[datetime, datetime, str]]] = {}
    grouped_run: Dict[str, List[Tuple[datetime, datetime, str]]] = {}

    for row in op_rows:
        operator = str(row.get("Operator", "")).strip()
        if not operator:
            continue
        entity = (
            f"{row['PartNumber']}/{row['Batch_ID']}/OP{row['OperationSeq']}"
        )

        setup_start = parse_dt(str(row["SetupStart"]))
        setup_end = parse_dt(str(row["SetupEnd"]))
        grouped_setup.setdefault(operator, []).append((setup_start, setup_end, entity))

        run_start = parse_dt(str(row["RunStart"]))
        run_end = parse_dt(str(row["RunEnd"]))
        grouped_run.setdefault(operator, []).append((run_start, run_end, entity))

    conflicts: List[Conflict] = []

    for operator, windows in grouped_setup.items():
        windows.sort(key=lambda x: x[0])
        for idx in range(1, len(windows)):
            prev = windows[idx - 1]
            curr = windows[idx]
            if interval_overlap((prev[0], prev[1]), (curr[0], curr[1])):
                conflicts.append(
                    Conflict(
                        code="PERSON_CONFLICT",
                        entity_ref=operator,
                        message=(
                            "Setup overlap between "
                            f"{prev[2]} and {curr[2]} at {curr[0].strftime('%Y-%m-%d %H:%M')}"
                        ),
                    )
                )

    if mode == "setup_and_run":
        for operator, windows in grouped_run.items():
            windows.sort(key=lambda x: x[0])
            for idx in range(1, len(windows)):
                prev = windows[idx - 1]
                curr = windows[idx]
                if interval_overlap((prev[0], prev[1]), (curr[0], curr[1])):
                    conflicts.append(
                        Conflict(
                            code="PERSON_CONFLICT",
                            entity_ref=operator,
                            message=(
                                "Run overlap between "
                                f"{prev[2]} and {curr[2]} at {curr[0].strftime('%Y-%m-%d %H:%M')}"
                            ),
                        )
                    )

    return conflicts


def check_pn_conflict(op_rows: Sequence[Dict[str, Any]]) -> List[Conflict]:
    grouped: Dict[Tuple[str, str], List[int]] = {}
    for row in op_rows:
        key = (str(row["PartNumber"]), str(row["Batch_ID"]))
        grouped.setdefault(key, []).append(int(row["OperationSeq"]))

    conflicts: List[Conflict] = []
    for (part, batch), seqs in grouped.items():
        seq_sorted = sorted(seqs)
        unique_sorted = sorted(set(seqs))
        if len(unique_sorted) != len(seq_sorted):
            conflicts.append(
                Conflict(
                    code="PN_CONFLICT",
                    entity_ref=f"{part}/{batch}",
                    message=f"Duplicate operation sequence(s): {seq_sorted}",
                )
            )
            continue

        if not unique_sorted:
            continue

        expected = list(range(1, max(unique_sorted) + 1))
        if unique_sorted != expected:
            missing = [x for x in expected if x not in unique_sorted]
            conflicts.append(
                Conflict(
                    code="PN_CONFLICT",
                    entity_ref=f"{part}/{batch}",
                    message=(
                        "Operation chain is not contiguous from OP1. "
                        f"got={unique_sorted}, missing={missing}"
                    ),
                )
            )
    return conflicts


def check_holiday_conflict(
    op_rows: Sequence[Dict[str, Any]], holiday_dates: Set[date]
) -> List[Conflict]:
    if not holiday_dates:
        return []

    conflicts: List[Conflict] = []
    for row in op_rows:
        entity = f"{row['PartNumber']}/{row['Batch_ID']}/OP{row['OperationSeq']}"

        setup_start = parse_dt(str(row["SetupStart"]))
        setup_end = parse_dt(str(row["SetupEnd"]))
        if interval_hits_holiday(setup_start, setup_end, holiday_dates):
            conflicts.append(
                Conflict(
                    code="HOLIDAY_CONFLICT",
                    entity_ref=entity,
                    message=(
                        f"Setup interval {setup_start.strftime('%Y-%m-%d %H:%M')} -> "
                        f"{setup_end.strftime('%Y-%m-%d %H:%M')} intersects holiday"
                    ),
                )
            )

        run_start = parse_dt(str(row["RunStart"]))
        run_end = parse_dt(str(row["RunEnd"]))
        if interval_hits_holiday(run_start, run_end, holiday_dates):
            conflicts.append(
                Conflict(
                    code="HOLIDAY_CONFLICT",
                    entity_ref=entity,
                    message=(
                        f"Run interval {run_start.strftime('%Y-%m-%d %H:%M')} -> "
                        f"{run_end.strftime('%Y-%m-%d %H:%M')} intersects holiday"
                    ),
                )
            )

    return conflicts


def check_machine_availability_conflict(
    op_rows: Sequence[Dict[str, Any]], raw_input: Dict[str, Any]
) -> List[Conflict]:
    rules = raw_input.get("machine_availability", [])
    if not rules:
        return []

    by_machine: Dict[str, List[Dict[str, Any]]] = {}
    for rule in rules:
        machine = str(rule.get("machine", "")).strip()
        if machine:
            by_machine.setdefault(machine, []).append(rule)

    conflicts: List[Conflict] = []
    for row in op_rows:
        machine = str(row.get("Machine", "")).strip()
        if machine not in by_machine:
            continue

        entity = f"{row['PartNumber']}/{row['Batch_ID']}/OP{row['OperationSeq']}"
        op_start = parse_dt(str(row["SetupStart"]))
        op_end = parse_dt(str(row["RunEnd"]))

        for rule in by_machine[machine]:
            rtype = str(rule.get("type", "")).upper().strip()
            blocked = False
            detail = ""

            if rtype == "PERMANENT":
                blocked = True
                detail = "PERMANENT"
            elif rtype == "AVAILABLE_FROM":
                from_raw = rule.get("from") or rule.get("start")
                if from_raw:
                    available_from = parse_dt(str(from_raw))
                    blocked = op_start < available_from
                    detail = f"AVAILABLE_FROM {available_from.strftime('%Y-%m-%d %H:%M')}"
            elif rtype == "RANGE":
                start_raw = rule.get("start")
                end_raw = rule.get("end")
                if start_raw and end_raw:
                    b_start = parse_dt(str(start_raw))
                    b_end = parse_dt(str(end_raw))
                    blocked = interval_overlap((op_start, op_end), (b_start, b_end))
                    detail = (
                        f"RANGE {b_start.strftime('%Y-%m-%d %H:%M')} -> "
                        f"{b_end.strftime('%Y-%m-%d %H:%M')}"
                    )

            if blocked:
                conflicts.append(
                    Conflict(
                        code="MACHINE_AVAILABILITY_CONFLICT",
                        entity_ref=entity,
                        message=f"{machine} violates availability rule {detail}",
                    )
                )

    return conflicts


def collect_conflicts(
    op_rows: Sequence[Dict[str, Any]],
    raw_input: Dict[str, Any],
    person_mode: str,
) -> List[Conflict]:
    holiday_dates = parse_holiday_dates(raw_input.get("holidays", []))

    conflicts = []
    conflicts.extend(check_machine_conflict(op_rows))
    conflicts.extend(check_person_conflict(op_rows, mode=person_mode))
    conflicts.extend(check_pn_conflict(op_rows))
    conflicts.extend(check_holiday_conflict(op_rows, holiday_dates=holiday_dates))
    conflicts.extend(check_machine_availability_conflict(op_rows, raw_input=raw_input))

    # Deduplicate exact duplicates while preserving order.
    deduped: List[Conflict] = []
    seen: Set[Tuple[str, str, str]] = set()
    for item in conflicts:
        key = (item.code, item.entity_ref, item.message)
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def write_csv(path: Path, rows: Sequence[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    headers = list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def evaluate_case(
    repo_root: Path,
    case: Dict[str, Any],
    case_out_dir: Path,
) -> Dict[str, Any]:
    input_rel = case["input"]
    input_path = repo_root / input_rel
    raw_input = json.loads(input_path.read_text(encoding="utf-8"))

    batches, settings = load_input(input_path, demo=None, lane_mode="machine")
    results = run_piece_level_schedule(batches, settings)

    person_mode = str(case.get("person_conflict_mode", "setup_only"))
    conflicts = collect_conflicts(
        op_rows=results["operation_rows"],
        raw_input=raw_input,
        person_mode=person_mode,
    )

    found_codes = sorted({c.code for c in conflicts})
    expected_present = list(case.get("expected_present", []))
    expected_absent = list(case.get("expected_absent", []))

    missing_expected = sorted([c for c in expected_present if c not in found_codes])
    unexpected_present = sorted([c for c in expected_absent if c in found_codes])

    ok = not missing_expected and not unexpected_present

    conflict_rows = [
        {"Code": c.code, "EntityRef": c.entity_ref, "Message": c.message}
        for c in conflicts
    ]

    write_csv(case_out_dir / "operation_summary.csv", results["operation_rows"])
    write_csv(case_out_dir / "piece_timeline.csv", results["piece_rows"])
    write_csv(case_out_dir / "conflicts.csv", conflict_rows)

    report = {
        "id": case["id"],
        "description": case.get("description", ""),
        "size": case.get("size", "unknown"),
        "input": input_rel,
        "person_conflict_mode": person_mode,
        "found_codes": found_codes,
        "expected_present": expected_present,
        "expected_absent": expected_absent,
        "missing_expected": missing_expected,
        "unexpected_present": unexpected_present,
        "status": "PASS" if ok else "FAIL",
        "validation_from_scheduler": results.get("validation", {}),
        "conflict_count": len(conflicts),
    }

    (case_out_dir / "report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )

    return report


def load_manifest(path: Path) -> Dict[str, Any]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for case in manifest.get("cases", []):
        case.setdefault("expected_present", [])
        case.setdefault("expected_absent", [])
    return manifest


def run_suite(manifest_path: Path, out_dir: Path) -> Dict[str, Any]:
    repo_root = Path(__file__).resolve().parent.parent
    manifest = load_manifest(manifest_path)

    cases = manifest.get("cases", [])
    reports = []

    for case in cases:
        case_id = case["id"]
        case_out_dir = out_dir / case_id
        case_out_dir.mkdir(parents=True, exist_ok=True)
        report = evaluate_case(repo_root=repo_root, case=case, case_out_dir=case_out_dir)
        reports.append(report)
        print(
            f"[{report['status']}] {case_id} found={','.join(report['found_codes']) or 'NONE'}"
        )

    passed = sum(1 for r in reports if r["status"] == "PASS")
    failed = len(reports) - passed

    suite_report = {
        "manifest": str(manifest_path),
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(reports),
        "passed": passed,
        "failed": failed,
        "all_passed": failed == 0,
        "reports": reports,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "suite_report.json").write_text(
        json.dumps(suite_report, indent=2), encoding="utf-8"
    )

    return suite_report


def main() -> None:
    parser = argparse.ArgumentParser(description="Piece conflict suite")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("scripts/testcases/piece_conflicts/manifest.json"),
        help="Path to suite manifest JSON",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("out/piece_conflict_suite"),
        help="Output folder for suite reports",
    )
    args = parser.parse_args()

    suite = run_suite(args.manifest, args.out_dir)
    print(
        f"[SUITE] total={suite['total']} passed={suite['passed']} failed={suite['failed']}"
    )
    if not suite["all_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
