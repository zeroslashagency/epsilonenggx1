-- Add profile-scoped scheduler run permissions.
insert into public.permissions (code, name, description, category)
values
  ('schedule.run.basic', 'Run Schedule (Basic)', 'Can run scheduler in Basic profile (run-only)', 'schedule'),
  ('schedule.run.advanced', 'Run Schedule (Advanced)', 'Can run scheduler in Advanced profile (setup + run)', 'schedule')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  updated_at = now();

-- Grant basic run to operational roles.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'schedule.run.basic'
where r.name in ('Admin', 'Manager', 'Employee', 'Operator')
on conflict (role_id, permission_id) do nothing;

-- Grant advanced run only to setup-capable roles.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'schedule.run.advanced'
where r.name in ('Admin', 'Manager')
on conflict (role_id, permission_id) do nothing;

-- Enforce isolation: strip advanced run from run-only roles.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and p.code = 'schedule.run.advanced'
  and r.name in ('Employee', 'Operator', 'Viewer');
