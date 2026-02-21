-- Backfill role assignments from profiles.role into user_roles and expose
-- a verification view for mapping drift.
-- Safe to run multiple times.

WITH normalized_roles AS (
  SELECT
    r.id,
    r.name,
    lower(regexp_replace(r.name, '[^a-z0-9]+', '', 'g')) AS normalized_name
  FROM roles r
),
candidate_assignments AS (
  SELECT
    p.id AS user_id,
    p.role AS profile_role,
    nr.id AS role_id,
    nr.name AS role_name,
    row_number() OVER (
      PARTITION BY p.id
      ORDER BY
        CASE WHEN lower(p.role) = lower(nr.name) THEN 0 ELSE 1 END,
        nr.name
    ) AS choice_rank
  FROM profiles p
  JOIN normalized_roles nr
    ON nr.normalized_name = lower(regexp_replace(p.role, '[^a-z0-9]+', '', 'g'))
  WHERE p.role IS NOT NULL
    AND btrim(p.role) <> ''
    AND lower(btrim(p.role)) NOT IN ('deactivated', 'deleted', 'inactive')
),
selected_assignments AS (
  SELECT user_id, role_id, role_name
  FROM candidate_assignments
  WHERE choice_rank = 1
)
INSERT INTO user_roles (user_id, role_id)
SELECT sa.user_id, sa.role_id
FROM selected_assignments sa
WHERE NOT EXISTS (
  SELECT 1
  FROM user_roles ur
  WHERE ur.user_id = sa.user_id
    AND ur.role_id = sa.role_id
);

WITH normalized_roles AS (
  SELECT
    r.id,
    r.name,
    lower(regexp_replace(r.name, '[^a-z0-9]+', '', 'g')) AS normalized_name
  FROM roles r
),
candidate_assignments AS (
  SELECT
    p.id AS user_id,
    nr.name AS role_name,
    row_number() OVER (
      PARTITION BY p.id
      ORDER BY
        CASE WHEN lower(p.role) = lower(nr.name) THEN 0 ELSE 1 END,
        nr.name
    ) AS choice_rank
  FROM profiles p
  JOIN normalized_roles nr
    ON nr.normalized_name = lower(regexp_replace(p.role, '[^a-z0-9]+', '', 'g'))
  WHERE p.role IS NOT NULL
    AND btrim(p.role) <> ''
    AND lower(btrim(p.role)) NOT IN ('deactivated', 'deleted', 'inactive')
)
UPDATE profiles p
SET
  role = ca.role_name,
  role_badge = ca.role_name,
  updated_at = now()
FROM candidate_assignments ca
WHERE p.id = ca.user_id
  AND ca.choice_rank = 1
  AND (p.role IS DISTINCT FROM ca.role_name OR p.role_badge IS DISTINCT FROM ca.role_name);

CREATE OR REPLACE VIEW public.v_rbac_role_mapping_health AS
WITH normalized_roles AS (
  SELECT
    r.id,
    r.name,
    lower(regexp_replace(r.name, '[^a-z0-9]+', '', 'g')) AS normalized_name
  FROM roles r
),
profile_candidates AS (
  SELECT
    p.id AS user_id,
    p.email,
    p.full_name,
    p.role AS profile_role,
    p.role_badge,
    nr.id AS expected_role_id,
    nr.name AS expected_role_name
  FROM profiles p
  LEFT JOIN normalized_roles nr
    ON nr.normalized_name = lower(regexp_replace(coalesce(p.role, ''), '[^a-z0-9]+', '', 'g'))
  WHERE p.role IS NOT NULL
    AND btrim(p.role) <> ''
    AND lower(btrim(p.role)) NOT IN ('deactivated', 'deleted', 'inactive')
),
assigned_roles AS (
  SELECT
    ur.user_id,
    array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS assigned_role_names
  FROM user_roles ur
  LEFT JOIN roles r ON r.id = ur.role_id
  GROUP BY ur.user_id
)
SELECT
  pc.user_id,
  pc.email,
  pc.full_name,
  pc.profile_role,
  pc.role_badge,
  pc.expected_role_id,
  pc.expected_role_name,
  coalesce(ar.assigned_role_names, ARRAY[]::text[]) AS assigned_role_names,
  CASE
    WHEN pc.expected_role_id IS NULL THEN 'profile_role_unmapped'
    WHEN coalesce(array_length(ar.assigned_role_names, 1), 0) = 0 THEN 'missing_user_role'
    WHEN NOT (pc.expected_role_name = ANY(coalesce(ar.assigned_role_names, ARRAY[]::text[]))) THEN 'mismatch'
    ELSE 'ok'
  END AS status
FROM profile_candidates pc
LEFT JOIN assigned_roles ar ON ar.user_id = pc.user_id;

COMMENT ON VIEW public.v_rbac_role_mapping_health IS
'RBAC drift report comparing profiles.role against user_roles assignments.';
