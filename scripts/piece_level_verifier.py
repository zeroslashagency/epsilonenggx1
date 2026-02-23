#!/usr/bin/env python3
"""
Piece-level scheduling verifier with visual timeline output.

Usage examples:
  python scripts/piece_level_verifier.py --demo batch3 --out-dir out
  python scripts/piece_level_verifier.py --demo batch250 --out-dir out
  python scripts/piece_level_verifier.py --input data/schedule_input.json --out-dir out
  python scripts/piece_level_verifier.py --demo batch3 --live --live-delay 0.4 --live-operations 1,2,3 --live-machines "VMC 1,VMC 2,VMC 3"
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple


TIME_FMT = "%Y-%m-%d %H:%M"


@dataclass
class OperationSpec:
    operation_seq: int
    operation_name: str
    setup_time_min: int
    cycle_time_min: int
    machine: Optional[str] = None
    eligible_machines: List[str] = field(default_factory=list)


@dataclass
class BatchSpec:
    part_number: str
    batch_id: str
    batch_qty: int
    start_datetime: datetime
    due_datetime: Optional[datetime]
    operations: List[OperationSpec]


@dataclass
class Breakdown:
    machine: str
    start: datetime
    end: datetime


@dataclass
class Settings:
    setup_window: Tuple[str, str]
    production_window: Tuple[str, str]
    operators_by_shift: Dict[str, List[str]]
    shifts: Dict[str, Tuple[str, str]]
    holidays: List[datetime]
    breakdowns: List[Breakdown]
    lane_mode: str = "machine"
    machine_mode: str = "respect_fixed"


@dataclass
class Interval:
    start: datetime
    end: datetime


def parse_dt(value: str) -> datetime:
    value = value.strip()
    for fmt in (TIME_FMT, "%Y-%m-%dT%H:%M", "%m/%d/%Y %H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unsupported datetime format: {value}")


def parse_window(window: str) -> Tuple[str, str]:
    parts = [p.strip() for p in window.split("-")]
    if len(parts) != 2:
        raise ValueError(f"Invalid window format: {window}")
    return parts[0], parts[1]


def minute_iter(start: datetime, end: datetime):
    cursor = start
    while cursor < end:
        yield cursor
        cursor += timedelta(minutes=1)


def day_window_contains(dt: datetime, window: Tuple[str, str]) -> bool:
    s, e = window
    st = datetime.combine(dt.date(), datetime.strptime(s, "%H:%M").time())
    et = datetime.combine(dt.date(), datetime.strptime(e, "%H:%M").time())
    if et <= st:
        # overnight window
        return dt >= st or dt < et
    return st <= dt < et


def shift_contains_interval(
    start: datetime, end: datetime, shift_window: Tuple[str, str]
) -> bool:
    s, e = shift_window
    st = datetime.combine(start.date(), datetime.strptime(s, "%H:%M").time())
    et = datetime.combine(start.date(), datetime.strptime(e, "%H:%M").time())
    if et <= st:
        et += timedelta(days=1)
    if end <= start:
        return False
    return st <= start and end <= et


def overlaps(a: Interval, b: Interval) -> bool:
    return a.start < b.end and b.start < a.end


def is_holiday(dt: datetime, holidays: Sequence[datetime]) -> bool:
    d = dt.date()
    return any(h.date() == d for h in holidays)


def machine_blocked(
    machine: str, dt: datetime, breakdowns: Sequence[Breakdown]
) -> bool:
    for b in breakdowns:
        if b.machine == machine and b.start <= dt < b.end:
            return True
    return False


def next_machine_free(
    machine: str, start: datetime, machine_cal: Dict[str, List[Interval]]
) -> datetime:
    cursor = start
    while True:
        hit = None
        for interval in machine_cal.get(machine, []):
            if interval.start <= cursor < interval.end:
                hit = interval
                break
        if not hit:
            return cursor
        cursor = hit.end


def operator_busy_minute(
    operator: str, dt: datetime, operator_cal: Dict[str, List[Interval]]
) -> bool:
    for interval in operator_cal.get(operator, []):
        if interval.start <= dt < interval.end:
            return True
    return False


def is_setup_minute_allowed(
    dt: datetime,
    machine: str,
    operator: str,
    settings: Settings,
) -> bool:
    if is_holiday(dt, settings.holidays):
        return False
    if machine_blocked(machine, dt, settings.breakdowns):
        return False
    if not day_window_contains(dt, settings.setup_window):
        return False
    return day_window_contains(dt, settings.shifts[operator])


def is_run_minute_allowed(dt: datetime, machine: str, settings: Settings) -> bool:
    if is_holiday(dt, settings.holidays):
        return False
    if machine_blocked(machine, dt, settings.breakdowns):
        return False
    return day_window_contains(dt, settings.production_window)


def add_work_minutes(
    start: datetime,
    minutes: int,
    machine: str,
    settings: Settings,
    mode: str,
    operator: Optional[str] = None,
) -> datetime:
    remaining = max(0, minutes)
    cursor = start
    while remaining > 0:
        if mode == "setup":
            assert operator is not None
            if is_setup_minute_allowed(cursor, machine, operator, settings):
                remaining -= 1
        else:
            if is_run_minute_allowed(cursor, machine, settings):
                remaining -= 1
        cursor += timedelta(minutes=1)
    return cursor


def next_allowed_run_start(
    start: datetime, machine: str, settings: Settings
) -> datetime:
    cursor = start
    while not is_run_minute_allowed(cursor, machine, settings):
        cursor += timedelta(minutes=1)
    return cursor


def find_setup_slot(
    candidate_start: datetime,
    duration_min: int,
    machine: str,
    settings: Settings,
    operator_cal: Dict[str, List[Interval]],
) -> Tuple[datetime, datetime, str, List[Interval], List[str]]:
    logs: List[str] = []
    all_operators = [
        op for shift_ops in settings.operators_by_shift.values() for op in shift_ops
    ]
    unique_ops = list(dict.fromkeys(all_operators))
    horizon_end = candidate_start + timedelta(days=30)
    best_payload = None

    for op in unique_ops:
        cursor = candidate_start
        remaining = max(0, duration_min)
        setup_start: Optional[datetime] = None
        setup_segments: List[Interval] = []
        segment_start: Optional[datetime] = None

        while cursor < horizon_end and remaining > 0:
            allowed = is_setup_minute_allowed(cursor, machine, op, settings)
            if allowed and not operator_busy_minute(op, cursor, operator_cal):
                if setup_start is None:
                    setup_start = cursor
                if segment_start is None:
                    segment_start = cursor
                remaining -= 1
            else:
                if segment_start is not None:
                    setup_segments.append(Interval(segment_start, cursor))
                    segment_start = None

            cursor += timedelta(minutes=1)

        if remaining > 0 or setup_start is None:
            continue

        if segment_start is not None:
            setup_segments.append(Interval(segment_start, cursor))

        setup_end = cursor
        if best_payload is None or setup_end < best_payload["setup_end"]:
            best_payload = {
                "operator": op,
                "setup_start": setup_start,
                "setup_end": setup_end,
                "segments": setup_segments,
            }

    if best_payload is None:
        raise RuntimeError("Could not find setup slot within 30 days")

    setup_start = best_payload["setup_start"]
    setup_end = best_payload["setup_end"]
    op = best_payload["operator"]
    setup_segments = best_payload["segments"]
    total_span = int((setup_end - setup_start).total_seconds() // 60)
    paused_min = max(0, total_span - duration_min)
    logs.append(
        f"[SETUP-ASSIGN] machine={machine} operator={op} setup_start={fmt(setup_start)} setup_end={fmt(setup_end)} active_min={duration_min} paused_min={paused_min}"
    )
    return setup_start, setup_end, op, setup_segments, logs


def fmt(dt: datetime) -> str:
    return dt.strftime(TIME_FMT)


def build_live_event_rows(
    piece_rows: Sequence[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    if not piece_rows:
        return []

    batch_anchor: Dict[Tuple[str, str], datetime] = {}
    for row in piece_rows:
        key = (row["PartNumber"], row["Batch_ID"])
        run_start = parse_dt(row["RunStart"])
        if key not in batch_anchor or run_start < batch_anchor[key]:
            batch_anchor[key] = run_start

    event_records: List[Tuple[datetime, int, int, int, Dict[str, Any]]] = []
    for row in piece_rows:
        part = row["PartNumber"]
        batch = row["Batch_ID"]
        piece = int(row["Piece"])
        op_seq = int(row["OperationSeq"])
        op_name = row["OperationName"]
        machine = row["Machine"]
        anchor = batch_anchor[(part, batch)]

        start_ts = parse_dt(row["RunStart"])
        end_ts = parse_dt(row["RunEnd"])
        event_defs = [
            ("START", 0, start_ts, f"MOVE P{piece} -> OP{op_seq} ({op_name}) on {machine}"),
            ("END", 1, end_ts, f"DONE P{piece} @ OP{op_seq} ({op_name}) on {machine}"),
        ]
        for event_name, event_rank, event_ts, message in event_defs:
            elapsed = int((event_ts - anchor).total_seconds() // 60)
            event_row = {
                "PartNumber": part,
                "Batch_ID": batch,
                "Piece": piece,
                "OperationSeq": op_seq,
                "OperationName": op_name,
                "Machine": machine,
                "Event": event_name,
                "EventTime": fmt(event_ts),
                "BatchClock": f"T+{elapsed // 60:02d}:{elapsed % 60:02d}",
                "Message": message,
            }
            event_records.append((event_ts, event_rank, op_seq, piece, event_row))

    event_records.sort(key=lambda x: (x[0], x[1], x[2], x[3]))
    return [record[4] for record in event_records]


def parse_int_filter(raw: str) -> Optional[Set[int]]:
    text = raw.strip()
    if not text:
        return None

    values: Set[int] = set()
    for token in text.split(","):
        item = token.strip()
        if not item:
            continue
        values.add(int(item))
    return values


def parse_machine_filter(raw: str) -> Optional[Set[str]]:
    text = raw.strip()
    if not text:
        return None

    values: Set[str] = set()
    for token in text.split(","):
        item = token.strip().upper()
        if item:
            values.add(item)
    return values or None


def replay_live_events(
    event_rows: Sequence[Dict[str, Any]],
    delay_s: float,
    max_piece: int,
    op_filter: Optional[Set[int]],
    machine_filter: Optional[Set[str]],
) -> None:
    filtered = []
    for row in event_rows:
        piece = int(row["Piece"])
        op_seq = int(row["OperationSeq"])
        machine = str(row["Machine"]).strip().upper()

        if max_piece > 0 and piece > max_piece:
            continue
        if op_filter is not None and op_seq not in op_filter:
            continue
        if machine_filter is not None and machine not in machine_filter:
            continue
        filtered.append(row)

    print(
        f"[LIVE] replay events={len(filtered)} delay={delay_s:.2f}s max_piece={'ALL' if max_piece <= 0 else max_piece}"
    )
    if not filtered:
        print("[LIVE] no events match the live filters")
        return

    for row in filtered:
        print(
            f"[{row['BatchClock']}] {row['EventTime']} | {row['PartNumber']} {row['Batch_ID']} | {row['Message']}"
        )
        if delay_s > 0:
            time.sleep(delay_s)


def run_piece_level_schedule(
    batches: Sequence[BatchSpec], settings: Settings
) -> Dict[str, Any]:
    machine_cal: Dict[str, List[Interval]] = {}
    operator_cal: Dict[str, List[Interval]] = {op: [] for op in settings.shifts}

    op_rows: List[Dict[str, Any]] = []
    piece_rows: List[Dict[str, Any]] = []
    logs: List[str] = []
    warnings: List[str] = []

    for batch in batches:
        prev_piece_end: List[datetime] = []
        for op in sorted(batch.operations, key=lambda x: x.operation_seq):
            candidate_base = batch.start_datetime
            if prev_piece_end:
                candidate_base = max(candidate_base, prev_piece_end[0])

            if op.machine and settings.machine_mode != "optimize":
                machine_candidates = [op.machine]
            else:
                machine_candidates = (
                    list(op.eligible_machines) if op.eligible_machines else []
                )
                if op.machine and op.machine not in machine_candidates:
                    machine_candidates.insert(0, op.machine)
                if not machine_candidates:
                    machine_candidates = [op.machine or "VMC 1"]

            best = None
            best_payload = None
            best_logs: List[str] = []

            for machine in machine_candidates:
                machine_start = next_machine_free(machine, candidate_base, machine_cal)
                setup_start, setup_end, operator, setup_segments, setup_logs = find_setup_slot(
                    machine_start,
                    op.setup_time_min,
                    machine,
                    settings,
                    operator_cal,
                )

                piece_starts: List[datetime] = []
                piece_ends: List[datetime] = []
                for i in range(batch.batch_qty):
                    arrival = prev_piece_end[i] if prev_piece_end else setup_end
                    prev_same = piece_ends[i - 1] if i > 0 else setup_end
                    candidate = max(arrival, prev_same, setup_end)
                    run_start = next_allowed_run_start(candidate, machine, settings)
                    run_end = add_work_minutes(
                        run_start,
                        op.cycle_time_min,
                        machine,
                        settings,
                        mode="run",
                    )
                    piece_starts.append(run_start)
                    piece_ends.append(run_end)

                run_end_batch = piece_ends[-1]
                if best is None or run_end_batch < best:
                    best = run_end_batch
                    best_payload = {
                        "machine": machine,
                        "operator": operator,
                        "setup_start": setup_start,
                        "setup_end": setup_end,
                        "setup_segments": setup_segments,
                        "piece_starts": piece_starts,
                        "piece_ends": piece_ends,
                        "run_start": piece_starts[0],
                        "run_end": run_end_batch,
                    }
                    best_logs = setup_logs

            assert best_payload is not None
            machine = best_payload["machine"]
            operator = best_payload["operator"]
            setup_start = best_payload["setup_start"]
            setup_end = best_payload["setup_end"]
            setup_segments = best_payload["setup_segments"]
            run_start = best_payload["run_start"]
            run_end = best_payload["run_end"]
            piece_starts = best_payload["piece_starts"]
            piece_ends = best_payload["piece_ends"]

            logs.extend(best_logs)
            machine_cal.setdefault(machine, []).append(Interval(setup_start, run_end))
            operator_cal.setdefault(operator, []).extend(setup_segments)

            due_note = ""
            status = "OK"
            if batch.due_datetime and run_end > batch.due_datetime:
                status = "⚠"
                due_note = f"Due miss by {(run_end - batch.due_datetime)}"
                warnings.append(
                    f"[DUE] part={batch.part_number} batch={batch.batch_id} op={op.operation_seq} run_end={fmt(run_end)} due={fmt(batch.due_datetime)}"
                )

            op_rows.append(
                {
                    "PartNumber": batch.part_number,
                    "Batch_ID": batch.batch_id,
                    "OperationSeq": op.operation_seq,
                    "OperationName": op.operation_name,
                    "Machine": machine,
                    "Operator": operator,
                    "SetupStart": fmt(setup_start),
                    "SetupEnd": fmt(setup_end),
                    "RunStart": fmt(run_start),
                    "RunEnd": fmt(run_end),
                    "Status": status,
                    "Notes": due_note,
                }
            )

            for idx, (ps, pe) in enumerate(zip(piece_starts, piece_ends), start=1):
                arrival = prev_piece_end[idx - 1] if prev_piece_end else setup_end
                piece_rows.append(
                    {
                        "PartNumber": batch.part_number,
                        "Batch_ID": batch.batch_id,
                        "Piece": idx,
                        "OperationSeq": op.operation_seq,
                        "OperationName": op.operation_name,
                        "Machine": machine,
                        "Operator": operator,
                        "ArrivalFromPrevOp": fmt(arrival),
                        "RunStart": fmt(ps),
                        "RunEnd": fmt(pe),
                        "WaitMin": int((ps - arrival).total_seconds() // 60),
                    }
                )

            prev_piece_end = piece_ends

    event_rows = build_live_event_rows(piece_rows)
    validation = validate_results(op_rows, operator_cal, machine_cal, settings)
    validation["warnings"].extend(warnings)
    validation["logs"] = logs

    return {
        "operation_rows": op_rows,
        "piece_rows": piece_rows,
        "event_rows": event_rows,
        "validation": validation,
    }


def validate_results(
    op_rows: Sequence[Dict[str, Any]],
    operator_cal: Dict[str, List[Interval]],
    machine_cal: Dict[str, List[Interval]],
    settings: Settings,
) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    for op, intervals in operator_cal.items():
        sorted_iv = sorted(intervals, key=lambda x: x.start)
        for i in range(1, len(sorted_iv)):
            if overlaps(sorted_iv[i - 1], sorted_iv[i]):
                errors.append(f"Operator overlap: {op} at {fmt(sorted_iv[i].start)}")

    for machine, intervals in machine_cal.items():
        sorted_iv = sorted(intervals, key=lambda x: x.start)
        for i in range(1, len(sorted_iv)):
            if overlaps(sorted_iv[i - 1], sorted_iv[i]):
                errors.append(
                    f"Machine overlap: {machine} at {fmt(sorted_iv[i].start)}"
                )

    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for row in op_rows:
        grouped.setdefault((row["PartNumber"], row["Batch_ID"]), []).append(row)

    for key, rows in grouped.items():
        rows = sorted(rows, key=lambda x: int(x["OperationSeq"]))
        for i in range(1, len(rows)):
            prev_end = parse_dt(rows[i - 1]["RunEnd"])
            curr_end = parse_dt(rows[i]["RunEnd"])
            if curr_end < prev_end:
                errors.append(
                    f"RunEnd ordering violation for {key[0]} {key[1]} op{rows[i]['OperationSeq']}"
                )

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "operation_rows": len(op_rows),
            "machines": len(machine_cal),
            "operators": len(operator_cal),
        },
    }


def write_csv(path: Path, rows: Sequence[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_html_timeline(
    path: Path, piece_rows: Sequence[Dict[str, Any]], lane_mode: str
) -> None:
    payload = []
    for row in piece_rows:
        lane = row["Machine"] if lane_mode == "machine" else f"Op {row['OperationSeq']}"
        payload.append(
            {
                "part": row["PartNumber"],
                "batch": row["Batch_ID"],
                "piece": int(row["Piece"]),
                "op": int(row["OperationSeq"]),
                "lane": lane,
                "start": row["RunStart"],
                "end": row["RunEnd"],
            }
        )

    html_template = """<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Piece Flow Timeline</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #f6f8fb; color: #1f2937; }
    .bar-wrap { position: relative; border: 1px solid #cbd5e1; background: #fff; overflow: auto; }
    .lane { position: relative; height: 40px; border-bottom: 1px solid #e2e8f0; }
    .lane-name { position: absolute; left: 0; width: 120px; top: 10px; font-size: 12px; color: #334155; }
    .track { margin-left: 130px; position: relative; height: 40px; min-width: 1200px; }
    .bar { position: absolute; top: 8px; height: 24px; border-radius: 5px; font-size: 11px; color: #fff; padding: 3px 6px; box-sizing: border-box; white-space: nowrap; overflow: hidden; }
  </style>
</head>
<body>
  <h2>Piece-by-Piece Flow (__LANE_MODE__ lanes)</h2>
  <p>Each bar = one piece at one operation. Label: PN1001 | P1 | OP1 (or compact P1-OP1).</p>
  <div id="root" class="bar-wrap"></div>
  <script>
    const rows = __DATA__;
    const toMs = (s) => new Date(s.replace(' ', 'T')).getTime();
    const minTs = Math.min(...rows.map(r => toMs(r.start)));
    const maxTs = Math.max(...rows.map(r => toMs(r.end)));
    const span = Math.max(1, maxTs - minTs);
    const px = 1000;
    const lanes = [...new Set(rows.map(r => r.lane))];

    const partHues = {};
    [...new Set(rows.map(r => r.part))].forEach((p, i) => {
      partHues[p] = (110 + i * 70) % 360;
    });
    const opColor = (part, op) => {
      const hue = partHues[part] ?? 160;
      const light = Math.max(35, 62 - (Number(op) - 1) * 8);
      return `hsl(${hue} 72% ${light}%)`;
    };

    const root = document.getElementById('root');
    lanes.forEach((lane) => {
      const laneDiv = document.createElement('div');
      laneDiv.className = 'lane';

      const name = document.createElement('div');
      name.className = 'lane-name';
      name.textContent = lane;
      laneDiv.appendChild(name);

      const track = document.createElement('div');
      track.className = 'track';

      rows.filter(r => r.lane === lane).forEach(r => {
        const st = toMs(r.start);
        const en = toMs(r.end);
        const left = ((st - minTs) / span) * px;
        const width = Math.max(2, ((en - st) / span) * px);
        const b = document.createElement('div');
        b.className = 'bar';
        b.style.left = `${left}px`;
        b.style.width = `${width}px`;
        b.style.background = opColor(r.part, r.op);
        b.title = `${r.part} | ${r.batch} | Piece ${r.piece} | Op ${r.op}\n${r.start} -> ${r.end}`;
        b.textContent = width > 170 ? `${r.part} | P${r.piece} | OP${r.op}` : `P${r.piece}-OP${r.op}`;
        track.appendChild(b);
      });

      laneDiv.appendChild(track);
      root.appendChild(laneDiv);
    });
  </script>
</body>
</html>
"""
    html = html_template.replace("__DATA__", json.dumps(payload)).replace(
        "__LANE_MODE__", lane_mode.title()
    )
    path.write_text(html, encoding="utf-8")


def write_html_flow_map(path: Path, piece_rows: Sequence[Dict[str, Any]]) -> None:
    payload = []
    for row in piece_rows:
        payload.append(
            {
                "part": row["PartNumber"],
                "batch": row["Batch_ID"],
                "piece": int(row["Piece"]),
                "op": int(row["OperationSeq"]),
                "machine": row["Machine"],
                "start": row["RunStart"],
                "end": row["RunEnd"],
            }
        )

    html_template = """<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Piece Flow Map</title>
  <style>
    :root { --bg:#070a0f; --panel:#0d1320; --line:#22314c; --text:#d9e7ff; --muted:#93a4c4; --accent:#9cff57; }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family: ui-sans-serif, -apple-system, Segoe UI, sans-serif;
      color:var(--text);
      background:
        linear-gradient(rgba(130,160,210,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(130,160,210,0.08) 1px, transparent 1px),
        var(--bg);
      background-size:24px 24px, 24px 24px, auto;
      min-height:100vh;
      padding:18px;
    }
    .top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
    .title { font-size:18px; font-weight:700; letter-spacing:0.2px; }
    .hint { color:var(--muted); font-size:12px; }
    .controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:8px; }
    .controls label { font-size:12px; color:var(--muted); }
    .controls input, .controls select { background:#111a2b; color:var(--text); border:1px solid #2b3c5d; border-radius:6px; padding:4px 8px; }
    .controls button { border:1px solid #35517b; background:#16325b; color:#dff2ff; border-radius:6px; padding:5px 10px; cursor:pointer; }
    .board-wrap {
      background:rgba(9, 14, 24, 0.85);
      border:2px solid var(--accent);
      border-radius:12px;
      overflow:auto;
      box-shadow:0 0 0 1px rgba(156,255,87,0.3), 0 0 40px rgba(156,255,87,0.08);
    }
    #board { position:relative; min-width:1300px; min-height:760px; }
    .legend { margin-top:10px; display:flex; gap:12px; flex-wrap:wrap; color:var(--muted); font-size:12px; }
    .chip { border:1px solid #2e456a; border-radius:999px; padding:4px 10px; background:#0f1a2d; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="title">Piece Flow Map (Machine Lanes)</div>
      <div class="hint">Label: PN1001 | P1 | OP1. OP = OperationSeq, P = Piece.</div>
    </div>
    <div class="controls">
      <label>Part</label>
      <select id="partSelect"></select>
      <label>Piece From</label>
      <input id="pieceFrom" type="number" min="1" value="1" />
      <label>To</label>
      <input id="pieceTo" type="number" min="1" value="20" />
      <button id="applyBtn">Apply</button>
      <button id="resetBtn">Reset</button>
    </div>
  </div>
  <div class="board-wrap"><div id="board"></div></div>
  <div class="legend" id="legend"></div>
  <script>
    const rows = __DATA__;
    const machineOrder = ['VMC 1','VMC 2','VMC 3','VMC 4','VMC 5','VMC 6','VMC 7','VMC 8','VMC 9','VMC 10'];
    const board = document.getElementById('board');
    const partSelect = document.getElementById('partSelect');
    const pieceFrom = document.getElementById('pieceFrom');
    const pieceTo = document.getElementById('pieceTo');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const legend = document.getElementById('legend');

    const allParts = [...new Set(rows.map(r => r.part))].sort();
    const partHues = {};
    allParts.forEach((p, i) => { partHues[p] = (110 + i * 70) % 360; });

    function opShade(part, op) {
      const hue = partHues[part] ?? 160;
      const light = Math.max(35, 62 - (Number(op) - 1) * 8);
      return `hsl(${hue} 72% ${light}%)`;
    }

    function pieceColor(piece) {
      const hue = (piece * 37) % 360;
      return `hsl(${hue} 80% 62%)`;
    }

    function parseMs(s) { return new Date(s.replace(' ', 'T')).getTime(); }
    function machineIndex(name) { const idx = machineOrder.indexOf(name); return idx >= 0 ? idx : machineOrder.length + 1; }
    function laneY(machine) { return 70 + machineIndex(machine) * 62; }

    function seedControls() {
      partSelect.innerHTML = '';
      const all = document.createElement('option');
      all.value = '__ALL__';
      all.textContent = 'All Parts';
      partSelect.appendChild(all);
      allParts.forEach((p) => {
        const o = document.createElement('option');
        o.value = p;
        o.textContent = p;
        partSelect.appendChild(o);
      });
      const maxPiece = Math.max(...rows.map(r => Number(r.piece)));
      pieceTo.value = String(Math.min(maxPiece, 20));
    }

    function render() {
      const selectedPart = partSelect.value;
      const pFrom = Number(pieceFrom.value || 1);
      const pTo = Number(pieceTo.value || 999999);
      const filtered = rows.filter(r => {
        if (selectedPart !== '__ALL__' && r.part !== selectedPart) return false;
        return Number(r.piece) >= pFrom && Number(r.piece) <= pTo;
      });

      if (filtered.length === 0) {
        board.innerHTML = '<div style="padding:16px;color:#93a4c4">No rows for this filter.</div>';
        return;
      }

      const minTs = Math.min(...filtered.map(r => parseMs(r.start)));
      const maxTs = Math.max(...filtered.map(r => parseMs(r.end)));
      const span = Math.max(1, maxTs - minTs);
      const width = 1800;
      const laneCount = machineOrder.length;
      const height = 120 + laneCount * 62;
      const leftPad = 180;
      const rightPad = 200;
      const drawW = width - leftPad - rightPad;
      const ops = [...new Set(filtered.map(r => Number(r.op)))].sort((a, b) => a - b);
      const parts = [...new Set(filtered.map(r => r.part))].sort();

      let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
      machineOrder.forEach((m, i) => {
        const y = 70 + i * 62;
        svg += `<line x1="${leftPad}" y1="${y}" x2="${leftPad + drawW}" y2="${y}" stroke="#23324d" stroke-width="1" />`;
        svg += `<text x="24" y="${y + 5}" fill="#a8bddf" font-size="16" font-weight="600">${m}</text>`;
      });
      ops.forEach((op, idx) => {
        const y = 85 + idx * 26;
        svg += `<text x="${leftPad + drawW + 22}" y="${y}" fill="#9cff57" font-size="14" font-weight="700">OP${op}</text>`;
      });

      const pointByPieceOp = new Map();
      filtered.forEach((r) => {
        const st = parseMs(r.start);
        const en = parseMs(r.end);
        const x = leftPad + ((st - minTs) / span) * drawW;
        const w = Math.max(28, ((en - st) / span) * drawW);
        const y = laneY(r.machine) - 16;
        const base = opShade(r.part, r.op);
        const selected = Number(r.piece) === 1;
        const border = selected ? '#ecfeff' : pieceColor(Number(r.piece));
        const longLabel = `${r.part} | P${r.piece} | OP${r.op}`;
        const shortLabel = `P${r.piece}-OP${r.op}`;
        const text = w > 180 ? longLabel : shortLabel;

        svg += `<rect x="${x.toFixed(2)}" y="${y}" rx="6" ry="6" width="${w.toFixed(2)}" height="32" fill="${base}" stroke="${border}" stroke-width="${selected ? 2.5 : 1.2}" />`;
        svg += `<text x="${(x + 7).toFixed(2)}" y="${y + 20}" fill="#051018" font-size="11" font-weight="700">${text}</text>`;

        pointByPieceOp.set(`${r.part}|${r.batch}|${r.piece}|${r.op}`, { x: x + w, y: y + 16, color: pieceColor(Number(r.piece)) });
      });

      const byPiece = new Map();
      filtered.forEach((r) => {
        const k = `${r.part}|${r.batch}|${r.piece}`;
        if (!byPiece.has(k)) byPiece.set(k, []);
        byPiece.get(k).push(r);
      });

      byPiece.forEach((arr) => {
        arr.sort((a, b) => Number(a.op) - Number(b.op));
        for (let i = 1; i < arr.length; i++) {
          const prev = pointByPieceOp.get(`${arr[i - 1].part}|${arr[i - 1].batch}|${arr[i - 1].piece}|${arr[i - 1].op}`);
          const currStartTs = parseMs(arr[i].start);
          const currX = leftPad + ((currStartTs - minTs) / span) * drawW;
          const currY = laneY(arr[i].machine);
          if (!prev) continue;
          const cx = (prev.x + currX) / 2;
          svg += `<path d="M ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} C ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${currY.toFixed(2)}, ${currX.toFixed(2)} ${currY.toFixed(2)}" fill="none" stroke="${prev.color}" stroke-width="1.4" stroke-opacity="0.85" marker-end="url(#arr)" />`;
        }
      });

      svg += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#86a7d8" /></marker></defs>`;
      svg += '</svg>';
      board.style.minHeight = `${height}px`;
      board.innerHTML = svg;

      legend.innerHTML = '';
      parts.forEach((p) => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = `${p} (part color)`;
        chip.style.borderColor = opShade(p, 1);
        chip.style.color = opShade(p, 1);
        legend.appendChild(chip);
      });
      ops.forEach((op) => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = `OP${op}`;
        const part = parts[0] || allParts[0] || 'PN';
        chip.style.background = opShade(part, op);
        chip.style.color = '#04111d';
        legend.appendChild(chip);
      });
      const note = document.createElement('div');
      note.className = 'chip';
      note.textContent = 'P1 is highlighted with brighter border';
      legend.appendChild(note);
    }

    applyBtn.addEventListener('click', render);
    resetBtn.addEventListener('click', () => {
      partSelect.value = '__ALL__';
      pieceFrom.value = '1';
      const maxPiece = Math.max(...rows.map(r => Number(r.piece)));
      pieceTo.value = String(Math.min(maxPiece, 20));
      render();
    });

    seedControls();
    render();
  </script>
</body>
</html>
"""

    html = html_template.replace("__DATA__", json.dumps(payload))
    path.write_text(html, encoding="utf-8")


def load_input(
    path: Optional[Path], demo: Optional[str], lane_mode: str
) -> Tuple[List[BatchSpec], Settings]:
    if demo:
        qty = 3 if demo == "batch3" else 250
        start = parse_dt("2026-02-21 07:00")
        due = parse_dt("2026-02-22 18:00")
        batch = BatchSpec(
            part_number="PN1001",
            batch_id="B01",
            batch_qty=qty,
            start_datetime=start,
            due_datetime=due,
            operations=[
                OperationSpec(
                    1, "Facing", 70, 18, eligible_machines=["VMC 1", "VMC 2"]
                ),
                OperationSpec(
                    2, "Drill", 70, 10, eligible_machines=["VMC 1", "VMC 2", "VMC 7"]
                ),
                OperationSpec(3, "Deburr", 70, 1, eligible_machines=["VMC 3", "VMC 4"]),
                OperationSpec(4, "Finish", 70, 1, eligible_machines=["VMC 5", "VMC 6"]),
            ],
        )
        settings = Settings(
            setup_window=parse_window("06:00-22:00"),
            production_window=parse_window("00:00-23:59"),
            operators_by_shift={"shift1": ["A", "B"], "shift2": ["C", "D"]},
            shifts={
                "A": parse_window("06:00-14:00"),
                "B": parse_window("06:00-14:00"),
                "C": parse_window("14:00-22:00"),
                "D": parse_window("14:00-22:00"),
            },
            holidays=[],
            breakdowns=[],
            lane_mode=lane_mode,
            machine_mode="respect_fixed",
        )
        return [batch], settings

    if path is None:
        raise ValueError("Provide --input or --demo")

    raw = json.loads(path.read_text(encoding="utf-8"))
    settings = Settings(
        setup_window=parse_window(raw.get("setup_window", "06:00-22:00")),
        production_window=parse_window(raw.get("production_window", "00:00-23:59")),
        operators_by_shift=raw.get(
            "operators_by_shift", {"shift1": ["A", "B"], "shift2": ["C", "D"]}
        ),
        shifts={
            key: parse_window(value)
            for key, value in raw.get(
                "shifts",
                {
                    "A": "06:00-14:00",
                    "B": "06:00-14:00",
                    "C": "14:00-22:00",
                    "D": "14:00-22:00",
                },
            ).items()
        },
        holidays=[
            parse_dt(f"{d} 00:00") if len(d) == 10 else parse_dt(d)
            for d in raw.get("holidays", [])
        ],
        breakdowns=[
            Breakdown(
                machine=b["machine"], start=parse_dt(b["start"]), end=parse_dt(b["end"])
            )
            for b in raw.get("breakdowns", [])
        ],
        lane_mode=lane_mode,
        machine_mode=raw.get("machine_mode", "respect_fixed"),
    )

    batches = []
    for b in raw["batches"]:
        batches.append(
            BatchSpec(
                part_number=b["part_number"],
                batch_id=b["batch_id"],
                batch_qty=int(b["batch_qty"]),
                start_datetime=parse_dt(b["start_datetime"]),
                due_datetime=parse_dt(b["due_datetime"])
                if b.get("due_datetime")
                else None,
                operations=[
                    OperationSpec(
                        operation_seq=int(op["operation_seq"]),
                        operation_name=op["operation_name"],
                        setup_time_min=int(op["setup_time_min"]),
                        cycle_time_min=int(op["cycle_time_min"]),
                        machine=op.get("machine"),
                        eligible_machines=op.get("eligible_machines", []),
                    )
                    for op in b["operations"]
                ],
            )
        )

    return batches, settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Piece-level scheduler verifier")
    parser.add_argument("--input", type=Path, help="Input JSON file")
    parser.add_argument(
        "--demo", choices=["batch3", "batch250"], help="Run built-in demo"
    )
    parser.add_argument(
        "--out-dir", type=Path, default=Path("out"), help="Output folder"
    )
    parser.add_argument(
        "--lane-mode", choices=["machine", "operation"], default="machine"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Replay piece movement in terminal in time order",
    )
    parser.add_argument(
        "--live-delay",
        type=float,
        default=0.35,
        help="Delay in seconds between live replay events",
    )
    parser.add_argument(
        "--live-pieces",
        type=int,
        default=0,
        help="Replay piece numbers up to this value (0 = all)",
    )
    parser.add_argument(
        "--live-operations",
        type=str,
        default="",
        help="Comma-separated op sequence filter, e.g. 1,2,3",
    )
    parser.add_argument(
        "--live-machines",
        type=str,
        default="",
        help='Comma-separated machine filter, e.g. "VMC 1,VMC 2,VMC 3"',
    )
    parser.add_argument(
        "--machine-mode",
        choices=["respect_fixed", "optimize"],
        default=None,
        help="Machine selection mode: respect fixed machine on each operation, or optimize across candidates",
    )
    args = parser.parse_args()

    batches, settings = load_input(args.input, args.demo, args.lane_mode)
    if args.machine_mode is not None:
        settings.machine_mode = args.machine_mode
    results = run_piece_level_schedule(batches, settings)

    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    op_path = out_dir / "operation_summary.csv"
    piece_path = out_dir / "piece_timeline.csv"
    live_path = out_dir / "piece_live_events.csv"
    validation_path = out_dir / "validation_report.json"
    html_path = out_dir / "piece_flow.html"
    flow_map_path = out_dir / "piece_flow_map.html"

    write_csv(op_path, results["operation_rows"])
    write_csv(piece_path, results["piece_rows"])
    write_csv(live_path, results["event_rows"])
    validation_path.write_text(
        json.dumps(results["validation"], indent=2), encoding="utf-8"
    )
    write_html_timeline(html_path, results["piece_rows"], args.lane_mode)
    write_html_flow_map(flow_map_path, results["piece_rows"])

    print(f"[OK] operation summary: {op_path}")
    print(f"[OK] piece timeline:    {piece_path}")
    print(f"[OK] live events:       {live_path}")
    print(f"[OK] validation:        {validation_path}")
    print(f"[OK] visual timeline:   {html_path}")
    print(f"[OK] visual flow map:   {flow_map_path}")

    if args.live:
        replay_live_events(
            results["event_rows"],
            delay_s=max(0.0, args.live_delay),
            max_piece=max(0, args.live_pieces),
            op_filter=parse_int_filter(args.live_operations),
            machine_filter=parse_machine_filter(args.live_machines),
        )

    if not results["validation"]["valid"]:
        print("[WARN] Validation failed. Check validation_report.json")


if __name__ == "__main__":
    main()
