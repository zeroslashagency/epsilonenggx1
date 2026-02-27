#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT_BASE = ROOT / "out" / "prd500"


@dataclass(frozen=True)
class Group:
    start: int
    end: int
    name: str
    check_type: str


GROUPS: list[Group] = [
    Group(1, 80, "Assignment Policy Unit", "unit"),
    Group(81, 140, "Personnel Parser/Normalization", "unit"),
    Group(141, 210, "Setup_output Datetime", "unit"),
    Group(211, 290, "Percent_Report Matrix", "integration"),
    Group(291, 350, "Import->Schedule->Workbook Integration", "integration"),
    Group(351, 400, "Golden Workbook Stability", "golden"),
    Group(401, 450, "Regression Bank", "regression"),
    Group(451, 480, "Performance + Determinism", "performance"),
    Group(481, 500, "Governance + Release Gate", "governance"),
]


SEED_SUITES: list[dict[str, Any]] = [
    {
        "id": "seed-assignment-policy",
        "check_ids": [1, 2, 3, 4, 5, 6, 7, 8],
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ],
    },
    {
        "id": "seed-personnel-parser",
        "check_ids": [81, 82, 83, 84],
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/personnel-v2.test.ts",
            "app/lib/features/scheduling/__tests__/import-input.integration.test.ts",
        ],
    },
    {
        "id": "seed-export-contract",
        "check_ids": [141, 142, 211, 212],
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/excel-export.test.ts",
        ],
    },
    {
        "id": "seed-prd-core",
        "check_ids": [291, 292, 293, 294],
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts",
        ],
    },
]


PHASE2_SUITES: list[dict[str, Any]] = [
    {
        "id": "phase2-assignment-policy",
        "check_ids": list(range(1, 21)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ],
    },
    {
        "id": "phase2-personnel-import",
        "check_ids": list(range(81, 121)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/personnel-v2.test.ts",
            "app/lib/features/scheduling/__tests__/import-input.integration.test.ts",
        ],
    },
    {
        "id": "phase2-prd-core",
        "check_ids": list(range(121, 141)) + list(range(291, 321)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts",
        ],
    },
    {
        "id": "phase2-export-contract",
        "check_ids": list(range(141, 161)) + list(range(211, 241)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/excel-export.test.ts",
        ],
    },
    {
        "id": "phase2-piece-flow-helpers",
        "check_ids": list(range(321, 351)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/piece-flow-helpers.test.ts",
        ],
    },
    {
        "id": "phase2-piece-flow-verifier",
        "check_ids": list(range(401, 431)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts",
        ],
    },
]


PHASE3_SUITES: list[dict[str, Any]] = [
    {
        "id": "phase3-golden-conflict-suite",
        "check_ids": list(range(351, 381)),
        "command": [
            "python3",
            "scripts/piece_conflict_suite.py",
            "--manifest",
            "scripts/testcases/piece_conflicts/manifest.json",
            "--out-dir",
            "out/piece_conflict_suite_phase3",
        ],
    },
    {
        "id": "phase3-golden-verifier-demo",
        "check_ids": list(range(381, 401)),
        "command": [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            "batch3",
            "--out-dir",
            "out/piece_level_verifier_phase3_golden",
        ],
    },
    {
        "id": "phase3-regression-handle-modes",
        "check_ids": list(range(431, 441)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ],
    },
    {
        "id": "phase3-regression-piece-verifier",
        "check_ids": list(range(441, 451)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts",
        ],
    },
    {
        "id": "phase3-performance-demo-a",
        "check_ids": list(range(451, 466)),
        "command": [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            "batch3",
            "--out-dir",
            "out/piece_level_verifier_phase3_perf_a",
        ],
    },
    {
        "id": "phase3-performance-demo-b",
        "check_ids": list(range(466, 481)),
        "command": [
            "python3",
            "scripts/piece_level_verifier.py",
            "--demo",
            "batch3",
            "--out-dir",
            "out/piece_level_verifier_phase3_perf_b",
        ],
    },
    {
        "id": "phase3-governance-bootstrap",
        "check_ids": list(range(481, 501)),
        "command": [
            "python3",
            "scripts/prd500_runner.py",
            "--out-dir",
            "out/prd500/governance-bootstrap",
        ],
    },
]


PHASE4_SUITES: list[dict[str, Any]] = [
    {
        "id": "phase4-assignment-policy-a",
        "check_ids": list(range(21, 51)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-handle-modes.test.ts",
        ],
    },
    {
        "id": "phase4-assignment-policy-b",
        "check_ids": list(range(51, 81)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts",
        ],
    },
    {
        "id": "phase4-setup-datetime-a",
        "check_ids": list(range(161, 191)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/excel-export.test.ts",
        ],
    },
    {
        "id": "phase4-setup-datetime-b",
        "check_ids": list(range(191, 211)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/piece-flow-verifier.test.ts",
        ],
    },
    {
        "id": "phase4-percent-report-a",
        "check_ids": list(range(241, 271)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/excel-export.test.ts",
        ],
    },
    {
        "id": "phase4-percent-report-b",
        "check_ids": list(range(271, 291)),
        "command": [
            "npm",
            "test",
            "--",
            "--watchAll=false",
            "app/lib/features/scheduling/__tests__/import-input.integration.test.ts",
            "app/lib/features/scheduling/__tests__/deterministic-prd-checks.test.ts",
        ],
    },
]


SUITE_PROFILES: dict[str, list[dict[str, Any]]] = {
    "seeded": SEED_SUITES,
    "phase2": PHASE2_SUITES,
    "phase3": PHASE3_SUITES,
    "phase2plus3": PHASE2_SUITES + PHASE3_SUITES,
    "phase4": PHASE4_SUITES,
    "phase2plus3plus4": PHASE2_SUITES + PHASE3_SUITES + PHASE4_SUITES,
}


def group_for(check_id: int) -> Group:
    for group in GROUPS:
        if group.start <= check_id <= group.end:
            return group
    raise ValueError(f"No group configured for CHK-{check_id:03d}")


def build_manifest() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for check_id in range(1, 501):
        group = group_for(check_id)
        rows.append(
            {
                "id": f"CHK-{check_id:03d}",
                "check_id": check_id,
                "group": group.name,
                "type": group.check_type,
                "status": "PENDING",
                "evidence": "",
                "notes": "",
            }
        )
    return rows


def run_profile(
    manifest: list[dict[str, Any]],
    out_dir: Path,
    suites: list[dict[str, Any]],
    profile_name: str,
) -> None:
    by_id = {item["check_id"]: item for item in manifest}
    logs_dir = out_dir / f"{profile_name}_logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    suite_results: list[dict[str, Any]] = []

    for suite in suites:
        suite_id = str(suite["id"])
        command = list(suite["command"])
        log_path = logs_dir / f"{suite_id}.log"
        started = time.time()

        proc = subprocess.run(
            command,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        duration_sec = round(time.time() - started, 3)
        log_path.write_text(
            "\n".join(
                [
                    f"$ {' '.join(command)}",
                    "",
                    "--- stdout ---",
                    proc.stdout,
                    "",
                    "--- stderr ---",
                    proc.stderr,
                ]
            ),
            encoding="utf-8",
        )

        status = "PASS" if proc.returncode == 0 else "FAIL"
        for check_id in suite["check_ids"]:
            item = by_id[int(check_id)]
            item["status"] = status
            item["evidence"] = str(log_path)
            item["notes"] = f"Profile {profile_name}: {suite_id}"

        suite_results.append(
            {
                "suite": suite_id,
                "status": status,
                "return_code": proc.returncode,
                "duration_sec": duration_sec,
                "check_count": len(suite["check_ids"]),
                "log": str(log_path),
                "command": command,
            }
        )

    (out_dir / f"{profile_name}_suite_results.json").write_text(
        json.dumps(suite_results, indent=2),
        encoding="utf-8",
    )


def summarize(manifest: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {"PASS": 0, "FAIL": 0, "PENDING": 0}
    for item in manifest:
        counts[item["status"]] = counts.get(item["status"], 0) + 1

    groups: list[dict[str, Any]] = []
    for group in GROUPS:
        subset = [
            item
            for item in manifest
            if group.start <= int(item["check_id"]) <= group.end
        ]
        groups.append(
            {
                "range": f"CHK-{group.start:03d}..CHK-{group.end:03d}",
                "name": group.name,
                "type": group.check_type,
                "pass": sum(1 for x in subset if x["status"] == "PASS"),
                "fail": sum(1 for x in subset if x["status"] == "FAIL"),
                "pending": sum(1 for x in subset if x["status"] == "PENDING"),
            }
        )

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "total": len(manifest),
        "counts": counts,
        "groups": groups,
    }


def write_markdown(summary: dict[str, Any], out_path: Path) -> None:
    lines = [
        "# PRD-500 Scorecard",
        "",
        f"Generated: {summary['generated_at']}",
        "",
        "## Status Counts",
        "",
        f"- PASS: {summary['counts'].get('PASS', 0)}",
        f"- FAIL: {summary['counts'].get('FAIL', 0)}",
        f"- PENDING: {summary['counts'].get('PENDING', 0)}",
        "",
        "## Group Status",
        "",
    ]
    for group in summary["groups"]:
        lines.append(
            f"- {group['range']} {group['name']} ({group['type']}): PASS={group['pass']}, FAIL={group['fail']}, PENDING={group['pending']}"
        )

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PRD-500 manifest and scorecard runner"
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Output directory. Default: out/prd500/<timestamp>",
    )
    parser.add_argument(
        "--run-seeded",
        action="store_true",
        help="Execute seeded existing test suites and mark mapped CHKs PASS/FAIL.",
    )
    parser.add_argument(
        "--run-profile",
        default="",
        help="Run named profile (seeded or phase2) and map CHK statuses.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = Path(args.out_dir) if args.out_dir else (DEFAULT_OUT_BASE / timestamp)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = build_manifest()
    selected_profile = args.run_profile.strip().lower()
    if args.run_seeded and not selected_profile:
        selected_profile = "seeded"

    if selected_profile:
        suites = SUITE_PROFILES.get(selected_profile)
        if not suites:
            raise SystemExit(
                f"Unknown profile '{selected_profile}'. Available: {', '.join(sorted(SUITE_PROFILES.keys()))}"
            )
        run_profile(manifest, out_dir, suites, selected_profile)

    summary = summarize(manifest)

    manifest_path = out_dir / "chk_manifest.json"
    scorecard_json_path = out_dir / "prd500_scorecard.json"
    scorecard_md_path = out_dir / "prd500_scorecard.md"

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    scorecard_json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_markdown(summary, scorecard_md_path)

    print(f"Manifest: {manifest_path}")
    print(f"Scorecard JSON: {scorecard_json_path}")
    print(f"Scorecard MD: {scorecard_md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
