-- Add missing legacy permission codes used by role profile mapping.
-- These codes are still emitted by old "MAIN - Dashboard/Analytics/Attendance" sections.
insert into public.permissions (code, name, description, category)
values
  ('dashboard.view', 'Dashboard View', 'View dashboard', 'dashboard'),
  ('dashboard.create', 'Dashboard Export/Create', 'Export dashboard/customize layout', 'dashboard'),
  ('analytics.view', 'Analytics View', 'View analytics/charts', 'analytics'),
  ('analytics.edit', 'Analytics Export', 'Export analytics/custom reports', 'analytics'),
  ('attendance.sync', 'Attendance Sync', 'Mutate/sync attendance records', 'attendance')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  updated_at = now();
