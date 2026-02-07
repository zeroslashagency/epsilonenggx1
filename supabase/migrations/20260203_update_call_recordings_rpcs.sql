-- =====================================================
-- Call Recordings RPC Updates
-- Created: 2026-02-03
-- Purpose: Filtered total duration + distinct users list
-- =====================================================

CREATE OR REPLACE FUNCTION public.call_recordings_total_duration(user_uuid uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(duration_seconds), 0)::bigint
    FROM public.call_recordings
    WHERE user_uuid IS NULL OR user_id = user_uuid;
$$;

GRANT EXECUTE ON FUNCTION public.call_recordings_total_duration(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.call_recordings_users()
RETURNS TABLE(user_id uuid, last_call_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT user_id, MAX(created_at) AS last_call_at
    FROM public.call_recordings
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY MAX(created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.call_recordings_users() TO service_role;
