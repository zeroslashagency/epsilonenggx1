# Complex Small-to-Big Matrix Report

Run ID: complex-matrix-2026-06-30T08-38-33-432Z
Generated: 2026-06-30T08:38:38.140Z

## Scenario Matrix
- Part order quantities: 10, 25, 5, 6, 3, 100
- Personnel variants: 8 (4 production / 4 setup), 50 (25 production / 25 setup)
- Modes: basic and advanced
- Size levels: small, medium, large

## Results Table
| Scenario | Mode | Personnel | Orders | Rows | Pieces | RunEvents | SetupEvents | RunMin | SetupMin | Runtime(ms) | People Used | Machines |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | basic | 8 (4/4) | 2 | 17 | 95 | 17 | 0 | 375 | 0 | 60 | 4 | 6 |
| small | advanced | 8 (4/4) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 87 | 8 | 6 |
| small | basic | 50 (25/25) | 2 | 17 | 95 | 17 | 0 | 404 | 0 | 24 | 17 | 6 |
| small | advanced | 50 (25/25) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 645 | 34 | 6 |
| medium | basic | 8 (4/4) | 6 | 30 | 430 | 30 | 0 | 1107 | 0 | 16 | 4 | 10 |
| medium | advanced | 8 (4/4) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 44 | 8 | 10 |
| medium | basic | 50 (25/25) | 6 | 30 | 430 | 30 | 0 | 1137 | 0 | 28 | 25 | 10 |
| medium | advanced | 50 (25/25) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 701 | 50 | 10 |
| large | basic | 8 (4/4) | 18 | 90 | 1290 | 90 | 0 | 3326 | 0 | 27 | 4 | 10 |
| large | advanced | 8 (4/4) | 18 | 90 | 1290 | 92 | 90 | 3294 | 873 | 143 | 8 | 10 |
| large | basic | 50 (25/25) | 18 | 90 | 1290 | 90 | 0 | 3377 | 0 | 76 | 25 | 10 |
| large | advanced | 50 (25/25) | 18 | 90 | 1290 | 90 | 90 | 3294 | 873 | 1879 | 50 | 10 |

## Trend Analysis
- small: avg runtime basic=42ms, advanced=366ms (delta 771.4%), setupMin basic=0, advanced=162, runMin basic=389.5, advanced=370
- medium: avg runtime basic=22ms, advanced=372.5ms (delta 1593.2%), setupMin basic=0, advanced=291, runMin basic=1122, advanced=1098
- large: avg runtime basic=51.5ms, advanced=1011ms (delta 1863.1%), setupMin basic=0, advanced=873, runMin basic=3351.5, advanced=3294

## Key Findings
- Basic mode produces zero setup events/minutes and excludes Setup_output; advanced mode consistently emits setup events/minutes and includes Setup_output.
- Quantity conservation passed for every part and operation: sum(batchQty) equals orderQuantity.
- Piece-level continuity passed for every (part, batch, piece): next operation starts after prior operation ends.
- Personnel_Daily_Full and Utilization_Summary reconcile exactly against Personnel_Event_Log for run/setup minutes and event counts.

## Artifacts
- Metrics JSON: /Users/xoxo/Documents/Projects/enterprise/epsilonengg/epsilonenggx1/reports/artifacts/alg-quality/complex-matrix-2026-06-30T08-38-33-432Z/metrics.json
- Workbook folder: /Users/xoxo/Documents/Projects/enterprise/epsilonengg/epsilonenggx1/reports/artifacts/alg-quality/complex-matrix-2026-06-30T08-38-33-432Z/workbooks
