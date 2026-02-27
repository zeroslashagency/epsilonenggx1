# Complex Small-to-Big Matrix Report

Run ID: complex-matrix-2026-02-26T20-24-26-707Z
Generated: 2026-02-26T20:24:38.952Z

## Scenario Matrix
- Part order quantities: 10, 25, 5, 6, 3, 100
- Personnel variants: 8 (4 production / 4 setup), 50 (25 production / 25 setup)
- Modes: basic and advanced
- Size levels: small, medium, large

## Results Table
| Scenario | Mode | Personnel | Orders | Rows | Pieces | RunEvents | SetupEvents | RunMin | SetupMin | Runtime(ms) | People Used | Machines |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | basic | 8 (4/4) | 2 | 17 | 95 | 17 | 0 | 375 | 0 | 18 | 4 | 6 |
| small | advanced | 8 (4/4) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 26 | 8 | 6 |
| small | basic | 50 (25/25) | 2 | 17 | 95 | 17 | 0 | 404 | 0 | 15 | 17 | 6 |
| small | advanced | 50 (25/25) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 522 | 34 | 6 |
| medium | basic | 8 (4/4) | 6 | 30 | 430 | 30 | 0 | 1107 | 0 | 27 | 4 | 10 |
| medium | advanced | 8 (4/4) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 139 | 8 | 10 |
| medium | basic | 50 (25/25) | 6 | 30 | 430 | 30 | 0 | 1137 | 0 | 84 | 25 | 10 |
| medium | advanced | 50 (25/25) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 2561 | 50 | 10 |
| large | basic | 8 (4/4) | 18 | 90 | 1290 | 90 | 0 | 3326 | 0 | 97 | 4 | 10 |
| large | advanced | 8 (4/4) | 18 | 90 | 1290 | 92 | 90 | 3294 | 873 | 588 | 8 | 10 |
| large | basic | 50 (25/25) | 18 | 90 | 1290 | 90 | 0 | 3377 | 0 | 286 | 25 | 10 |
| large | advanced | 50 (25/25) | 18 | 90 | 1290 | 90 | 90 | 3294 | 873 | 6294 | 50 | 10 |

## Trend Analysis
- small: avg runtime basic=16.5ms, advanced=274ms (delta 1560.6%), setupMin basic=0, advanced=162, runMin basic=389.5, advanced=370
- medium: avg runtime basic=55.5ms, advanced=1350ms (delta 2332.4%), setupMin basic=0, advanced=291, runMin basic=1122, advanced=1098
- large: avg runtime basic=191.5ms, advanced=3441ms (delta 1696.9%), setupMin basic=0, advanced=873, runMin basic=3351.5, advanced=3294

## Key Findings
- Basic mode produces zero setup events/minutes and excludes Setup_output; advanced mode consistently emits setup events/minutes and includes Setup_output.
- Quantity conservation passed for every part and operation: sum(batchQty) equals orderQuantity.
- Piece-level continuity passed for every (part, batch, piece): next operation starts after prior operation ends.
- Personnel_Daily_Full and Utilization_Summary reconcile exactly against Personnel_Event_Log for run/setup minutes and event counts.

## Artifacts
- Metrics JSON: /Users/xoxo/Desktop/epsilonschedulingmain 2/reports/artifacts/alg-quality/complex-matrix-2026-02-26T20-24-26-707Z/metrics.json
- Workbook folder: /Users/xoxo/Desktop/epsilonschedulingmain 2/reports/artifacts/alg-quality/complex-matrix-2026-02-26T20-24-26-707Z/workbooks
