-- CRITICAL RBAC FIX: remove anon-writable policies that let the public browser
-- anon key manage user_roles (self-privilege escalation) and read all profiles.
drop policy if exists "Anon can manage user roles for admin operations" on public.user_roles;
drop policy if exists "Anon can view user roles for admin operations" on public.user_roles;
drop policy if exists "Anon can view profiles for admin operations" on public.profiles;
