-- Assign role by role_id (matches modify-user contract). Admin-gated definer.
create or replace function public.app_admin_assign_role_by_id(target uuid, p_role_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare caller uuid := auth.uid(); v_role_canonical text;
begin
  if caller is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not public.is_admin(caller) then raise exception 'FORBIDDEN: admin privilege required' using errcode='42501'; end if;
  select name into v_role_canonical from public.roles where id=p_role_id;
  if v_role_canonical is null then raise exception 'NOT_FOUND: role id % does not exist', p_role_id using errcode='P0001'; end if;
  if target=caller and lower(v_role_canonical) not in ('super admin','super_admin')
     and public.count_super_admins() <= 1
     and exists (select 1 from public.profiles p where p.id=target
       and (lower(coalesce(p.role,'')) in ('super admin','super_admin')
            or lower(regexp_replace(coalesce(p.role_badge,''),'\s+','_','g'))='super_admin')) then
    raise exception 'CONFLICT: cannot demote the last Super Admin' using errcode='P0001'; end if;
  delete from public.user_roles where user_id=target;
  insert into public.user_roles (user_id,role_id) values (target,p_role_id) on conflict do nothing;
  update public.profiles set role=v_role_canonical where id=target;
  insert into public.audit_logs (actor_id,target_id,action,meta_json)
  values (caller,target,'admin_assign_role',jsonb_build_object('role',v_role_canonical,'role_id',p_role_id));
  return target;
end; $$;
revoke all on function public.app_admin_assign_role_by_id(uuid, uuid) from public, anon;
grant execute on function public.app_admin_assign_role_by_id(uuid, uuid) to authenticated;
