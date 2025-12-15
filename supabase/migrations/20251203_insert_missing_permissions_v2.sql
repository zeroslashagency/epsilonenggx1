-- Insert missing permissions and grant to Employee (Corrected Schema)
-- Date: 2025-12-03

-- 1. Insert Schedule Permissions (only code and description)
INSERT INTO public.permissions (code, description) VALUES
  ('schedule.view', 'Can view schedules'),
  ('schedule.create', 'Can create new schedules'),
  ('schedule.edit', 'Can edit existing schedules'),
  ('schedule.delete', 'Can delete schedules'),
  ('schedule.approve', 'Can approve schedules'),
  ('schedule.publish', 'Can publish schedules')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description;

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

-- 3. Grant other schedule permissions to Employee role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Employee'
  AND p.code IN ('schedule.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
