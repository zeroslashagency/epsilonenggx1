# Piece Live Simulation

## Goal
Add a slow, live piece-movement replay to the Python scheduler so movement across OP1/OP2/OP3 and VMC lanes is visible in real time.

## Tasks
- [x] Add event generation from piece timeline rows (`START`/`END` events per piece-operation) -> Verify: `piece_live_events.csv` is written.
- [x] Add CLI live replay controls (`--live`, `--live-delay`, `--live-pieces`, `--live-operations`, `--live-machines`) -> Verify: command runs and prints `[LIVE] replay events=`.
- [x] Keep existing outputs (`operation_summary.csv`, `piece_timeline.csv`, `piece_flow.html`, `piece_flow_map.html`) -> Verify: all files are still generated.
- [ ] Add tests for baseline and live replay mode -> Verify: `python3 -m pytest tests/test_piece_level_verifier.py` passes once `pytest` is installed.

## Done When
- [x] You can run one command and watch filtered piece movement slowly in terminal for selected OPs and VMCs.
