# Shift Schema Reconciliation (Phase 1)

## Goals
- Align Shift Manager UI with normalized rotation steps.
- Ensure schedule APIs and roster views use consistent data sources.
- Reduce reliance on legacy JSON `pattern` fields.

## Canonical Sources
- `shift_templates`: Fixed shift definitions and shared metadata.
- `shift_rotation_steps`: Rotation step definitions (replacing JSON pattern).
- `employee_shift_assignments`: Persistent assignments.
- `employee_daily_schedule`: Denormalized cache for daily views.

## Field Alignment
- `shift_templates.work_days`: Fixed shift working days.
- `shift_rotation_steps.work_days`: Per-step working days for rotations.
- `employee_daily_schedule.shift_id`: Stored for reliable template linkage.

## Notes
- Legacy `pattern` fields may still exist in older environments but are no longer required.
- API endpoints now manage rotation steps transactionally at the application layer.
