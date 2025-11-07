-- Check user mr1398463@gmail.com permissions
-- Run this in Supabase SQL Editor

-- 1. Check if user exists
SELECT 
  id,
  email,
  role,
  created_at
FROM auth.users
WHERE email = 'mr1398463@gmail.com';

-- 2. Check user's role in users table
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = 'mr1398463@gmail.com';

-- 3. Check user's permissions (if user_permissions table exists)
SELECT 
  up.*,
  p.code as permission_code,
  p.name as permission_name
FROM user_permissions up
LEFT JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id IN (
  SELECT id FROM users WHERE email = 'mr1398463@gmail.com'
);

-- 4. Check role permissions for Super Admin
SELECT 
  rp.*,
  p.code as permission_code,
  p.name as permission_name
FROM role_permissions rp
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Super Admin';

-- 5. Check all permissions
SELECT 
  id,
  code,
  name,
  description
FROM permissions
WHERE code IN ('view_analytics', 'view_charts', 'view_production')
ORDER BY code;

-- 6. Check roles table
SELECT 
  id,
  name,
  description,
  created_at
FROM roles
WHERE name = 'Super Admin';
