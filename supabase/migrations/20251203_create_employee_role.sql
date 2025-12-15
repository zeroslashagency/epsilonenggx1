-- Create Employee role and grant permissions
-- Date: 2025-12-03

-- 1. Create Employee role if it doesn't exist
INSERT INTO public.roles (name, description, is_manufacturing_role)
VALUES ('Employee', 'Standard employee role', false)
ON CONFLICT (name) DO NOTHING;

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

-- 3. Also grant schedule.view and other basic permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Employee'
  AND p.code IN ('schedule.view', 'dashboard.view', 'attendance.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
