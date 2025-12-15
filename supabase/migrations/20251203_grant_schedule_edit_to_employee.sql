-- Grant schedule.edit permission to Employee role
-- Date: 2025-12-03

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Employee'
  AND p.code = 'schedule.edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;
