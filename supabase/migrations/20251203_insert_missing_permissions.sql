-- Insert missing permissions and grant to Employee
-- Date: 2025-12-03

-- 1. Insert Schedule Permissions
INSERT INTO public.permissions (code, name, description, category) VALUES
  ('schedule.view', 'View Schedules', 'Can view schedules', 'schedule'),
  ('schedule.create', 'Create Schedules', 'Can create new schedules', 'schedule'),
  ('schedule.edit', 'Edit Schedules', 'Can edit existing schedules', 'schedule'),
  ('schedule.delete', 'Delete Schedules', 'Can delete schedules', 'schedule'),
  ('schedule.approve', 'Approve Schedules', 'Can approve schedules', 'schedule'),
  ('schedule.publish', 'Publish Schedules', 'Can publish schedules', 'schedule')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 2. Grant schedule.edit permission to Employee role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Employee'
  AND p.code = 'schedule.edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Grant other schedule permissions to Employee role (optional but good for consistency)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Employee'
  AND p.code IN ('schedule.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
