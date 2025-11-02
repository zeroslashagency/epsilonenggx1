-- =====================================================
-- FIX PRODUCTION RLS POLICIES TO USE RBAC SYSTEM
-- Created: 2025-11-02
-- Purpose: Update RLS policies to check role_permissions instead of user_permissions
-- =====================================================

-- Drop old policies that check user_permissions
DROP POLICY IF EXISTS "Users with operate_machine can manage orders" ON production_orders;
DROP POLICY IF EXISTS "Users with operate_machine can manage machines" ON machines;
DROP POLICY IF EXISTS "Users with operate_machine can manage tasks" ON production_tasks;
DROP POLICY IF EXISTS "Users with manage_users can manage personnel" ON production_personnel;
DROP POLICY IF EXISTS "Users with operate_machine can manage quality checks" ON quality_checks;
DROP POLICY IF EXISTS "Users with operate_machine can manage maintenance" ON maintenance_records;

-- =====================================================
-- PRODUCTION ORDERS POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with operate_machine can manage orders" ON production_orders
  FOR ALL USING (
    -- Super Admin has all access
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    -- Check role-based permissions via RBAC
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- MACHINES POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with operate_machine can manage machines" ON machines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- PRODUCTION PERSONNEL POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with manage_users can manage personnel" ON production_personnel
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'manage_users'
    )
  );

-- =====================================================
-- PRODUCTION TASKS POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with operate_machine can manage tasks" ON production_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- QUALITY CHECKS POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with operate_machine can manage quality checks" ON quality_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- MAINTENANCE RECORDS POLICIES (RBAC-COMPATIBLE)
-- =====================================================

CREATE POLICY "Users with operate_machine can manage maintenance" ON maintenance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this to verify policies are working:
-- SELECT * FROM production_orders LIMIT 1;
-- SELECT * FROM machines LIMIT 1;
