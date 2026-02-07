-- One-time migration: split legacy user_attendance JSON into web/mobile modules.
-- Keeps user_attendance for backward compatibility.

update roles
set permissions_json = jsonb_set(
  jsonb_set(
    coalesce(permissions_json, '{}'::jsonb),
    '{web_user_attendance}',
    coalesce(
      permissions_json->'web_user_attendance',
      permissions_json->'user_attendance',
      '{}'::jsonb
    ),
    true
  ),
  '{mobile_user_attendance}',
  coalesce(
    permissions_json->'mobile_user_attendance',
    permissions_json->'user_attendance',
    '{}'::jsonb
  ),
  true
)
where permissions_json is not null
  and permissions_json ? 'user_attendance';
