-- ============================================
-- PERMISSION-BASED ACCESS CONTROL (PBAC) SETUP
-- ============================================
-- This migration sets up the complete permission system
-- Date: 2025-10-10
-- ============================================

-- ============================================
-- 1. CREATE TABLES (if not exist)
-- ============================================

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User permissions junction table (for custom user permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);

-- ============================================
-- 3. INSERT PERMISSIONS
-- ============================================

-- Clear existing permissions (optional - comment out if you want to keep existing)
-- DELETE FROM user_permissions;
-- DELETE FROM role_permissions;
-- DELETE FROM permissions;

-- Dashboard Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('dashboard.view', 'View Dashboard', 'Can view the main dashboard', 'dashboard'),
  ('dashboard.create', 'Create Dashboard', 'Can create dashboard widgets', 'dashboard'),
  ('dashboard.edit', 'Edit Dashboard', 'Can edit dashboard settings', 'dashboard'),
  ('dashboard.delete', 'Delete Dashboard', 'Can delete dashboard widgets', 'dashboard'),
  ('dashboard.export', 'Export Dashboard', 'Can export dashboard data', 'dashboard')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Schedule Generator Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('schedule.view', 'View Schedules', 'Can view schedules', 'schedule'),
  ('schedule.create', 'Create Schedules', 'Can create new schedules', 'schedule'),
  ('schedule.edit', 'Edit Schedules', 'Can edit existing schedules', 'schedule'),
  ('schedule.delete', 'Delete Schedules', 'Can delete schedules', 'schedule'),
  ('schedule.approve', 'Approve Schedules', 'Can approve schedules', 'schedule'),
  ('schedule.publish', 'Publish Schedules', 'Can publish schedules', 'schedule')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Analytics Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('analytics.view', 'View Analytics', 'Can view analytics and reports', 'analytics'),
  ('analytics.create', 'Create Analytics', 'Can create custom analytics', 'analytics'),
  ('analytics.edit', 'Edit Analytics', 'Can edit analytics settings', 'analytics'),
  ('analytics.delete', 'Delete Analytics', 'Can delete analytics', 'analytics'),
  ('analytics.export', 'Export Analytics', 'Can export analytics data', 'analytics')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Attendance Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('attendance.view', 'View Attendance', 'Can view attendance records', 'attendance'),
  ('attendance.create', 'Create Attendance', 'Can create attendance records', 'attendance'),
  ('attendance.edit', 'Edit Attendance', 'Can edit attendance records', 'attendance'),
  ('attendance.delete', 'Delete Attendance', 'Can delete attendance records', 'attendance'),
  ('attendance.approve', 'Approve Attendance', 'Can approve attendance records', 'attendance'),
  ('attendance.sync', 'Sync Attendance', 'Can sync attendance from external systems', 'attendance')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- User Management Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('users.view', 'View Users', 'Can view user list and profiles', 'users'),
  ('users.create', 'Create Users', 'Can create new users', 'users'),
  ('users.edit', 'Edit Users', 'Can edit user information', 'users'),
  ('users.delete', 'Delete Users', 'Can delete users', 'users'),
  ('users.impersonate', 'Impersonate Users', 'Can impersonate other users', 'users'),
  ('users.permissions', 'Manage User Permissions', 'Can manage user permissions', 'users')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Role Management Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('roles.view', 'View Roles', 'Can view roles', 'roles'),
  ('roles.create', 'Create Roles', 'Can create new roles', 'roles'),
  ('roles.edit', 'Edit Roles', 'Can edit roles', 'roles'),
  ('roles.delete', 'Delete Roles', 'Can delete roles', 'roles'),
  ('roles.permissions', 'Manage Role Permissions', 'Can manage role permissions', 'roles')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- System Permissions
INSERT INTO permissions (code, name, description, category) VALUES
  ('system.settings', 'System Settings', 'Can access system settings', 'system'),
  ('system.audit', 'View Audit Logs', 'Can view audit logs', 'system'),
  ('system.backup', 'Backup System', 'Can create system backups', 'system'),
  ('system.restore', 'Restore System', 'Can restore from backups', 'system')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ============================================
-- 4. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Super Admin: All permissions (handled in code with wildcard)
-- No need to insert individual permissions for Super Admin

-- Admin: Most permissions except system-critical ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.code IN (
    'dashboard.view', 'dashboard.create', 'dashboard.edit', 'dashboard.export',
    'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.approve', 'schedule.publish',
    'analytics.view', 'analytics.create', 'analytics.edit', 'analytics.export',
    'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.approve', 'attendance.sync',
    'users.view', 'users.create', 'users.edit',
    'roles.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: View and edit permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.code IN (
    'dashboard.view', 'dashboard.export',
    'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.approve',
    'analytics.view', 'analytics.export',
    'attendance.view', 'attendance.edit', 'attendance.approve',
    'users.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Employee: Basic view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Employee'
  AND p.code IN (
    'dashboard.view',
    'schedule.view',
    'attendance.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operator: Manufacturing-specific permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Operator'
  AND p.code IN (
    'dashboard.view',
    'schedule.view',
    'attendance.view', 'attendance.create'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param UUID)
RETURNS TABLE (
  permission_code VARCHAR,
  permission_name VARCHAR,
  source VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  -- Get permissions from role
  SELECT DISTINCT
    p.code,
    p.name,
    'role'::VARCHAR as source
  FROM profiles prof
  JOIN role_permissions rp ON rp.role_id = prof.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE prof.id = user_id_param
  
  UNION
  
  -- Get custom user permissions
  SELECT DISTINCT
    p.code,
    p.name,
    'user'::VARCHAR as source
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id_param UUID, permission_code_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
  user_role VARCHAR;
BEGIN
  -- Check if Super Admin
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id_param;
  
  IF user_role = 'Super Admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check role permissions
  SELECT EXISTS (
    SELECT 1
    FROM profiles prof
    JOIN role_permissions rp ON rp.role_id = prof.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE prof.id = user_id_param
      AND p.code = permission_code_param
  ) INTO has_perm;
  
  IF has_perm THEN
    RETURN TRUE;
  END IF;
  
  -- Check user permissions
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = user_id_param
      AND p.code = permission_code_param
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE VIEWS FOR EASY QUERYING
-- ============================================

-- View: User permissions with details
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
  prof.id as user_id,
  prof.email,
  prof.role,
  p.code as permission_code,
  p.name as permission_name,
  p.category,
  CASE 
    WHEN up.id IS NOT NULL THEN 'custom'
    ELSE 'role'
  END as permission_source
FROM profiles prof
LEFT JOIN role_permissions rp ON rp.role_id = prof.role_id
LEFT JOIN user_permissions up ON up.user_id = prof.id
LEFT JOIN permissions p ON p.id = COALESCE(up.permission_id, rp.permission_id)
WHERE p.id IS NOT NULL;

-- View: Role permissions summary
CREATE OR REPLACE VIEW role_permissions_summary AS
SELECT 
  r.id as role_id,
  r.name as role_name,
  COUNT(rp.id) as permission_count,
  ARRAY_AGG(p.code ORDER BY p.code) as permissions
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY r.id, r.name;

-- ============================================
-- 7. ADD COMMENTS
-- ============================================

COMMENT ON TABLE permissions IS 'Stores all available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles';
COMMENT ON TABLE user_permissions IS 'Stores custom permissions for individual users';
COMMENT ON FUNCTION get_user_permissions IS 'Returns all permissions for a given user';
COMMENT ON FUNCTION user_has_permission IS 'Checks if a user has a specific permission';

-- ============================================
-- 8. DISPLAY RESULTS
-- ============================================

-- Show all permissions
SELECT 
  category,
  COUNT(*) as permission_count,
  ARRAY_AGG(code ORDER BY code) as permissions
FROM permissions
GROUP BY category
ORDER BY category;

-- Show role permissions
SELECT 
  r.name as role,
  COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.name;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Then test with: SELECT * FROM get_user_permissions('user-id-here');
-- ============================================
