-- RBAC hardening: DB-gated admin operations via SECURITY DEFINER RPCs.
-- Applied to project sxnaopzgaddvziplrlbe on 2026-07-01.

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    exists (select 1 from public.profiles p where p.id = uid
      and (lower(coalesce(p.role,'')) in ('super admin','super_admin')
           or lower(regexp_replace(coalesce(p.role_badge,''),'\s+','_','g')) = 'super_admin'))
    or exists (select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions pm on pm.id = rp.permission_id
      where ur.user_id = uid and pm.code in ('manage_users','users.manage'))
    or exists (select 1 from public.profiles p
      join public.roles r on r.name = p.role
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions pm on pm.id = rp.permission_id
      where p.id = uid and pm.code in ('manage_users','users.manage')),
    false);
$$;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

create or replace function public.count_super_admins()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from public.profiles p
  where lower(coalesce(p.role,'')) in ('super admin','super_admin')
     or lower(regexp_replace(coalesce(p.role_badge,''),'\s+','_','g')) = 'super_admin';
$$;
revoke all on function public.count_super_admins() from public, anon;
grant execute on function public.count_super_admins() to authenticated, service_role;

create or replace function public.app_admin_delete_user(target uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare caller uuid := auth.uid(); target_is_super boolean;
begin
  if caller is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not public.is_admin(caller) then raise exception 'FORBIDDEN: admin privilege required' using errcode='42501'; end if;
  if target = caller then raise exception 'CONFLICT: cannot delete your own account' using errcode='P0001'; end if;
  select (lower(coalesce(p.role,'')) in ('super admin','super_admin')
    or lower(regexp_replace(coalesce(p.role_badge,''),'\s+','_','g'))='super_admin')
    into target_is_super from public.profiles p where p.id = target;
  if coalesce(target_is_super,false) and public.count_super_admins() <= 1 then
    raise exception 'CONFLICT: cannot delete the last Super Admin' using errcode='P0001'; end if;
  update public.audit_logs set actor_id=null where actor_id=target;
  update public.security_audit_logs set user_id=null where user_id=target;
  update public.call_recordings set user_id=null where user_id=target;
  update public.global_settings set user_id=null where user_id=target;
  update public.schedule_outputs set user_id=null where user_id=target;
  update public.temp_schedule_sessions set user_id=null where user_id=target;
  update public.timeline_data set user_id=null where user_id=target;
  update public.timeline_sessions set user_id=null where user_id=target;
  update public.tasks set created_by=null where created_by=target;
  update public.task_assignments set assigned_by=null where assigned_by=target;
  delete from public.saved_orders where user_id=target;
  delete from public.user_activity where user_id=target;
  delete from public.user_roles where user_id=target;
  delete from public.profiles where id=target;
  delete from auth.users where id=target;
  insert into public.audit_logs (actor_id,target_id,action,meta_json)
  values (caller,target,'admin_delete_user',jsonb_build_object('source','app_admin_delete_user'));
  return target;
end; $$;
revoke all on function public.app_admin_delete_user(uuid) from public, anon;
grant execute on function public.app_admin_delete_user(uuid) to authenticated;

create or replace function public.app_admin_assign_role(target uuid, role_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare caller uuid := auth.uid(); v_role_id uuid; v_role_canonical text;
begin
  if caller is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not public.is_admin(caller) then raise exception 'FORBIDDEN: admin privilege required' using errcode='42501'; end if;
  select id,name into v_role_id,v_role_canonical from public.roles where lower(name)=lower(role_name) limit 1;
  if v_role_id is null then raise exception 'NOT_FOUND: role % does not exist', role_name using errcode='P0001'; end if;
  if target=caller and lower(v_role_canonical) not in ('super admin','super_admin')
     and public.count_super_admins() <= 1
     and exists (select 1 from public.profiles p where p.id=target
       and (lower(coalesce(p.role,'')) in ('super admin','super_admin')
            or lower(regexp_replace(coalesce(p.role_badge,''),'\s+','_','g'))='super_admin')) then
    raise exception 'CONFLICT: cannot demote the last Super Admin' using errcode='P0001'; end if;
  delete from public.user_roles where user_id=target;
  insert into public.user_roles (user_id,role_id) values (target,v_role_id) on conflict do nothing;
  update public.profiles set role=v_role_canonical where id=target;
  insert into public.audit_logs (actor_id,target_id,action,meta_json)
  values (caller,target,'admin_assign_role',jsonb_build_object('role',v_role_canonical));
  return target;
end; $$;
revoke all on function public.app_admin_assign_role(uuid, text) from public, anon;
grant execute on function public.app_admin_assign_role(uuid, text) to authenticated;
