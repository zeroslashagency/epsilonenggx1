import csv
import json
import subprocess
from datetime import datetime, timedelta
from pathlib import Path


def test_demo_batch3_runs(tmp_path: Path):
    out = tmp_path / "out"
    result = subprocess.run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            "batch3",
            "--out-dir",
            str(out),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (out / "operation_summary.csv").exists()
    assert (out / "piece_timeline.csv").exists()
    assert (out / "piece_live_events.csv").exists()
    assert (out / "validation_report.json").exists()
    assert (out / "piece_flow.html").exists()

    report = json.loads((out / "validation_report.json").read_text(encoding="utf-8"))
    assert "valid" in report
    assert "errors" in report


def test_demo_batch3_live_replay_runs(tmp_path: Path):
    out = tmp_path / "out"
    result = subprocess.run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            "batch3",
            "--out-dir",
            str(out),
            "--live",
            "--live-delay",
            "0",
            "--live-pieces",
            "2",
            "--live-operations",
            "1,2,3",
            "--live-machines",
            "VMC 1,VMC 2,VMC 3",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "[LIVE] replay events=" in result.stdout


def test_fixed_machine_is_respected_when_machine_is_present(tmp_path: Path):
    out = tmp_path / "out"
    input_path = tmp_path / "input.json"
    input_path.write_text(
        json.dumps(
            {
                "setup_window": "06:00-22:00",
                "production_window": "00:00-23:59",
                "operators_by_shift": {"shift1": ["A"]},
                "shifts": {"A": "06:00-22:00"},
                "holidays": [],
                "breakdowns": [],
                "batches": [
                    {
                        "part_number": "PNX",
                        "batch_id": "B01",
                        "batch_qty": 2,
                        "start_datetime": "2025-08-28 06:00",
                        "operations": [
                            {
                                "operation_seq": 1,
                                "operation_name": "Facing",
                                "setup_time_min": 10,
                                "cycle_time_min": 1,
                                "machine": "VMC 2",
                                "eligible_machines": ["VMC 1", "VMC 2"],
                            }
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--input",
            str(input_path),
            "--out-dir",
            str(out),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr

    with (out / "operation_summary.csv").open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows
    assert rows[0]["Machine"] == "VMC 2"


def test_setup_can_pause_across_unavailable_windows(tmp_path: Path):
    out = tmp_path / "out"
    input_path = tmp_path / "input.json"
    input_path.write_text(
        json.dumps(
            {
                "setup_window": "06:00-08:00",
                "production_window": "06:00-22:00",
                "operators_by_shift": {"shift1": ["A"]},
                "shifts": {"A": "06:00-22:00"},
                "holidays": [],
                "breakdowns": [],
                "batches": [
                    {
                        "part_number": "PNX",
                        "batch_id": "B01",
                        "batch_qty": 1,
                        "start_datetime": "2025-08-28 06:00",
                        "operations": [
                            {
                                "operation_seq": 1,
                                "operation_name": "LongSetup",
                                "setup_time_min": 180,
                                "cycle_time_min": 1,
                                "machine": "VMC 1",
                            }
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            "python3",
            "scripts/piece_level_verifier.py",
            "--input",
            str(input_path),
            "--out-dir",
            str(out),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr

    with (out / "operation_summary.csv").open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows
    setup_start = datetime.strptime(rows[0]["SetupStart"], "%Y-%m-%d %H:%M")
    setup_end = datetime.strptime(rows[0]["SetupEnd"], "%Y-%m-%d %H:%M")
    assert setup_end - setup_start > timedelta(minutes=180)
