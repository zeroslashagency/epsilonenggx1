-- Per-user "Mobile Access" flag — clean replacement for the confusing
-- "standalone attendance" naming. When true, the user's permission set gets
-- `mobile.rbac.enabled` injected so the Epsilon Flutter app unlocks.

-- 1. Column (additive, backfilled from legacy standalone_attendance)
alter table public.profiles
  add column if not exists mobile_access boolean not null default false;

update public.profiles
  set mobile_access = true
  where standalone_attendance = 'YES' and mobile_access = false;

comment on column public.profiles.mobile_access is
  'Per-user master switch for Epsilon mobile app access. Injects mobile.rbac.enabled into the permission set when true.';

-- 2. Inject mobile.rbac.enabled when mobile_access is on (mobile app reads this)
create or replace function public.get_user_permissions(p_user_id uuid default auth.uid())
 returns text[]
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    is_super boolean;
    perms text[];
    has_mobile boolean;
begin
    select exists (
        select 1 from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p_user_id and r.name = 'Super Admin'
    ) into is_super;

    if is_super then
        return array['*'];
    end if;

    select array_agg(distinct p.code)
    into perms
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = p_user_id;

    perms := coalesce(perms, array[]::text[]);

    select coalesce(mobile_access, false) into has_mobile
    from public.profiles where id = p_user_id;

    if has_mobile and not ('mobile.rbac.enabled' = any(perms)) then
        perms := perms || 'mobile.rbac.enabled';
    end if;

    return perms;
end;
$function$;
