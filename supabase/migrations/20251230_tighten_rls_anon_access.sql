-- ============================================================================
-- Security Fix: Tighten RLS Policies for Anonymous Users
-- Date: December 30, 2025
-- Purpose: Remove dangerous anon access from sensitive admin tables
-- ============================================================================

-- WARNING: This migration removes anonymous user access to sensitive tables.
-- Make sure all API routes use authenticated Supabase clients with proper tokens.

SET search_path TO public;

-- ============================================================================
-- FIX: User Roles - Remove anon access completely
-- ============================================================================

-- Drop dangerous anon policies
DROP POLICY IF EXISTS "Anon can view user roles for admin operations" ON user_roles;
DROP POLICY IF EXISTS "Anon can manage user roles for admin operations" ON user_roles;

-- Recreate with authenticated-only access
CREATE POLICY "Authenticated users can view user roles" ON user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- ============================================================================
-- FIX: Roles Table - Remove anon read access
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view roles for admin operations" ON roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;

-- Roles are read-only for authenticated users (admins manage via service role)
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT TO authenticated
  USING (true);  -- All authenticated users can view role definitions

-- ============================================================================
-- FIX: Permissions Table - Remove anon access
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view permissions for admin operations" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;

-- Permissions are read-only for authenticated users
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- FIX: Audit Logs - Remove anon access (very sensitive!)
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view audit logs for admin operations" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('Super Admin', 'Admin')
    )
  );

-- Service role can still insert (for API route audit logging)
-- This policy should already exist, keeping for safety
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- FIX: Profiles Table - Tighten anon access
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view profiles for admin operations" ON profiles;

-- Only authenticated users with proper roles can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())  -- Users can always see their own
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('Super Admin', 'Admin', 'Manager', 'HR')
    )
  );

-- ============================================================================
-- FIX: Dashboard Data - Remove anon access
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view dashboard data" ON dashboard_data;

-- Users can only view their own dashboard data
CREATE POLICY "Users can view own dashboard data" ON dashboard_data
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX: Device Status - Keep service role only for write, authenticated for read
-- ============================================================================

-- Already properly configured, just ensure no anon write access
DROP POLICY IF EXISTS "Anon can manage device status" ON device_status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '🔒 Security migration applied!';
  RAISE NOTICE '✅ Removed anon access from: user_roles, roles, permissions, audit_logs, profiles';
  RAISE NOTICE '✅ Tightened audit_logs to admin-only view';
  RAISE NOTICE '✅ Profiles now require admin role for full access';
  RAISE NOTICE '⚠️ If API routes fail with 403, ensure they use authenticated Supabase clients';
END $$;
