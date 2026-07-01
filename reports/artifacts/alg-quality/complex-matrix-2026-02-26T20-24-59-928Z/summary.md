# Complex Small-to-Big Matrix Report

Run ID: complex-matrix-2026-02-26T20-24-59-928Z
Generated: 2026-02-26T20:25:11.371Z

## Scenario Matrix
- Part order quantities: 10, 25, 5, 6, 3, 100
- Personnel variants: 8 (4 production / 4 setup), 50 (25 production / 25 setup)
- Modes: basic and advanced
- Size levels: small, medium, large

## Results Table
| Scenario | Mode | Personnel | Orders | Rows | Pieces | RunEvents | SetupEvents | RunMin | SetupMin | Runtime(ms) | People Used | Machines |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small | basic | 8 (4/4) | 2 | 17 | 95 | 17 | 0 | 375 | 0 | 35 | 4 | 6 |
| small | advanced | 8 (4/4) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 52 | 8 | 6 |
| small | basic | 50 (25/25) | 2 | 17 | 95 | 17 | 0 | 404 | 0 | 32 | 17 | 6 |
| small | advanced | 50 (25/25) | 2 | 17 | 95 | 17 | 17 | 370 | 162 | 680 | 34 | 6 |
| medium | basic | 8 (4/4) | 6 | 30 | 430 | 30 | 0 | 1107 | 0 | 32 | 4 | 10 |
| medium | advanced | 8 (4/4) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 140 | 8 | 10 |
| medium | basic | 50 (25/25) | 6 | 30 | 430 | 30 | 0 | 1137 | 0 | 97 | 25 | 10 |
| medium | advanced | 50 (25/25) | 6 | 30 | 430 | 30 | 30 | 1098 | 291 | 2557 | 50 | 10 |
| large | basic | 8 (4/4) | 18 | 90 | 1290 | 90 | 0 | 3326 | 0 | 96 | 4 | 10 |
| large | advanced | 8 (4/4) | 18 | 90 | 1290 | 92 | 90 | 3294 | 873 | 492 | 8 | 10 |
| large | basic | 50 (25/25) | 18 | 90 | 1290 | 90 | 0 | 3377 | 0 | 267 | 25 | 10 |
| large | advanced | 50 (25/25) | 18 | 90 | 1290 | 90 | 90 | 3294 | 873 | 5417 | 50 | 10 |

## Trend Analysis
- small: avg runtime basic=33.5ms, advanced=366ms (delta 992.5%), setupMin basic=0, advanced=162, runMin basic=389.5, advanced=370
- medium: avg runtime basic=64.5ms, advanced=1348.5ms (delta 1990.7%), setupMin basic=0, advanced=291, runMin basic=1122, advanced=1098
- large: avg runtime basic=181.5ms, advanced=2954.5ms (delta 1527.8%), setupMin basic=0, advanced=873, runMin basic=3351.5, advanced=3294

## Key Findings
- Basic mode produces zero setup events/minutes and excludes Setup_output; advanced mode consistently emits setup events/minutes and includes Setup_output.
- Quantity conservation passed for every part and operation: sum(batchQty) equals orderQuantity.
- Piece-level continuity passed for every (part, batch, piece): next operation starts after prior operation ends.
- Personnel_Daily_Full and Utilization_Summary reconcile exactly against Personnel_Event_Log for run/setup minutes and event counts.

## Artifacts
- Metrics JSON: /Users/xoxo/Desktop/epsilonschedulingmain 2/reports/artifacts/alg-quality/complex-matrix-2026-02-26T20-24-59-928Z/metrics.json
- Workbook folder: /Users/xoxo/Desktop/epsilonschedulingmain 2/reports/artifacts/alg-quality/complex-matrix-2026-02-26T20-24-59-928Z/workbooks
