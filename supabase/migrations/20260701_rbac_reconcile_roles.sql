-- Reconcile split-brain 'admin'(7 perms) vs 'Admin'(56 perms canonical);
-- repoint bindings, sync profiles, drop redundant + junk roles (qwer, attendance).
do $$
declare lc_admin uuid; canon_admin uuid;
begin
  select id into lc_admin from public.roles where name='admin';
  select id into canon_admin from public.roles where name='Admin';
  if lc_admin is not null and canon_admin is not null then
    update public.user_roles ur set role_id=canon_admin
      where ur.role_id=lc_admin
      and not exists (select 1 from public.user_roles x where x.user_id=ur.user_id and x.role_id=canon_admin);
    delete from public.user_roles where role_id=lc_admin;
    update public.profiles set role='Admin'
      where role='admin' and lower(coalesce(role_badge,''))<>'super_admin';
    delete from public.role_permissions where role_id=lc_admin;
    delete from public.roles where id=lc_admin;
  end if;
  delete from public.role_permissions rp using public.roles r
    where rp.role_id=r.id and r.name in ('qwer','attendance')
    and not exists (select 1 from public.user_roles ur where ur.role_id=r.id);
  delete from public.roles r where r.name in ('qwer','attendance')
    and not exists (select 1 from public.user_roles ur where ur.role_id=r.id);
end $$;
