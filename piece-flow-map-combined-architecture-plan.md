# Piece Flow Map Combined Architecture Plan

Date: 2026-02-24
Owner: Scheduler Engineering
Status: Proposed (awaiting implementation approval)

## 1) Executive Summary

This plan combines:

- Option 1 (Precision Gantt) as the base
- Option 2 (Machine + Person twin timeline sync)
- Option 3 (Piece inspector for exact per-piece trace)

Goal: make the visualization clearly trustworthy, with real date/time navigation, setup/run/person alignment, and KPI scoring that reflects efficiency (not only conflicts).

## 2) Investigation Findings (Current System)

### 2.1 Why the chart looks confusing now

- Timeline ticks currently show only time labels, not date labels for multi-day plans.
- Tick density is fixed (`8`) regardless of timeline span.
- Zoom changes width, but there is no explicit time-window navigator/brush.
- Playback mode reuses trace geometry and mostly adds a moving cursor.

### 2.2 Why score stays 100 often

Current score is conflict-penalty only:

- `score = max(0, 100 - critical*12 - warning*4 - info)`

If no conflicts are detected, score can remain 100 even when utilization/flow are poor.

### 2.3 Real vs fake timeline question

- If `Approximate View` badge is shown, rows are synthesized from aggregate run intervals.
- If badge is not shown, data comes from real piece timeline emitted by deterministic engine.

Conclusion:
- Large gaps can be real waiting/bottleneck behavior.
- Current rendering amplifies confusion because it does not expose wait reasons and day-level axis context.

## 3) Combined UI Mockup (Text)

### 3.1 Top: Time Navigator Bar (new)

- Left: `Timeline Source` badge
  - `REAL PIECE TIMELINE` (green)
  - `APPROXIMATE` (amber)
- Center: Date range controls
  - `From (datetime-local)`
  - `To (datetime-local)`
  - `Fit All` / `24h` / `72h` / `7d`
- Right: Horizontal mini-map brush (entire schedule span) with draggable viewport.

### 3.2 Main Panel A: Machine Precision Gantt (base)

- Sticky Y-axis: machine lanes (`VMC 1..10`).
- Dual X-axis:
  - Row 1: date ticks (`24 Feb`, `25 Feb`, ...)
  - Row 2: time ticks (`04:00`, `08:00`, ...)
- Bars:
  - Setup bar (thin, top half of lane, patterned)
  - Run bar (solid, bottom half)
- Wait segments:
  - Gray connector blocks between op transitions with reason label:
    - `Machine Busy`
    - `Window Closed`
    - `Holiday`
    - `Breakdown`
- Hover card includes:
  - Part/Batch/Piece/OP
  - Machine
  - Setup person + setup window
  - Run person + run window
  - Wait before this op (duration + reason)

### 3.3 Main Panel B: Person Timeline (synced)

- Toggle: `Show Person Timeline`.
- Lanes by person.
- Bars split by role tags:
  - `SETUP`
  - `RUN`
- Cross-highlight with machine panel on hover/select.

### 3.4 Right Inspector: Piece Journey Drilldown

- Selector: `Part -> Batch -> Piece`.
- Step list (OP1..OPN) with exact timestamps and durations.
- Explicit gap rows between operations:
  - `Gap: 17h 23m (Machine Busy VMC 3)`

## 4) Score Redesign (KPI-accurate)

## 4.1 New composite score

`FinalScore = 0.40*Feasibility + 0.20*Delivery + 0.20*Utilization + 0.20*Flow`

### A) Feasibility (40%)

- Conflict integrity component (current checks):
  - machine overlap
  - person overlap/capacity
  - routing/predecessor
  - breakdown/holiday/setup-window violations

### B) Delivery (20%)

- On-time completion ratio
- Weighted lateness severity

### C) Utilization (20%)

- Machine utilization in planned window
- Person utilization in planned window

### D) Flow (20%)

- Flow efficiency = active processing / (active + waiting)
- Average queue gap per part-batch chain
- WIP age severity (optional in phase 2)

## 4.2 KPI panel output (new)

- `Final Score`
- `Machine Utilization %`
- `Person Utilization %`
- `Flow Efficiency %`
- `On-time %`
- `Avg Queue Gap (h)`

## 5) Data/Architecture Changes

## 5.1 Add normalized event model

Create a unified row model for rendering:

- `setupStart/setupEnd`
- `runStart/runEnd`
- `setupPerson`
- `runPerson`
- `machine`
- `part/batch/piece/op`

## 5.2 Add transition/gap model

Per piece-chain transition:

- `fromOp`, `toOp`
- `gapStart`, `gapEnd`, `gapMs`
- `reason` enum (`MACHINE_BUSY`, `WINDOW_CLOSED`, `HOLIDAY`, `BREAKDOWN`, `UNKNOWN`)

## 5.3 Rendering strategy

- Keep SVG for v1, but split into components:
  - `TimelineNavigator`
  - `MachineGanttPanel`
  - `PersonGanttPanel`
  - `PieceInspectorPanel`
- Add viewport clipping by time-range before layout.
- Add sticky lane labels and synchronized horizontal scroll.

## 5.4 Quality engine extension

- Extend quality evaluator to compute KPI metrics and composite score.
- Preserve conflict list and severity model.

## 6) Delivery Plan

### Phase 1 (Core readability)

- Dual date/time axis
- Time-window controls + fit presets
- Sticky machine labels
- Tooltip with setup/run person + absolute datetime

### Phase 2 (KPI truthfulness)

- Composite score formula
- KPI metrics panel
- Backward-compatible quality report shape

### Phase 3 (Deep traceability)

- Person synchronized panel
- Gap classification and wait reason rendering
- Piece inspector drilldown

### Phase 4 (Hardening)

- Unit tests for metric computations
- Snapshot tests for timeline scaling and label formatting
- Complex scenario verification (existing 250-case and conflict suite)

## 7) Acceptance Criteria

- Multi-day schedule is readable without ambiguity (date + time always visible).
- User can scroll/pan exact time range and keep lane alignment stable.
- Setup and run persons are visible on timeline inspection.
- Score can drop below 100 for under-utilization/poor flow, even with zero conflicts.
- Existing conflict checks remain intact.

