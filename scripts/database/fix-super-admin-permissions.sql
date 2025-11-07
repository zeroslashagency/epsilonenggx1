-- Fix Super Admin permissions for mr1398463@gmail.com
-- Run this in Supabase SQL Editor AFTER checking the issue

-- Step 1: Ensure user has Super Admin role
UPDATE users
SET role = 'Super Admin'
WHERE email = 'mr1398463@gmail.com';

-- Step 2: Get the Super Admin role ID and user ID
DO $$
DECLARE
  v_role_id UUID;
  v_user_id UUID;
  v_analytics_perm_id UUID;
  v_charts_perm_id UUID;
  v_production_perm_id UUID;
BEGIN
  -- Get role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Super Admin';
  
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'mr1398463@gmail.com';
  
  -- Get permission IDs
  SELECT id INTO v_analytics_perm_id FROM permissions WHERE code = 'view_analytics';
  SELECT id INTO v_charts_perm_id FROM permissions WHERE code = 'view_charts';
  SELECT id INTO v_production_perm_id FROM permissions WHERE code = 'view_production';
  
  -- Ensure Super Admin role has all permissions
  IF v_role_id IS NOT NULL THEN
    -- Add analytics permission
    IF v_analytics_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_analytics_perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- Add charts permission
    IF v_charts_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_charts_perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
    
    -- Add production permission
    IF v_production_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_production_perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END IF;
  
  RAISE NOTICE 'Super Admin permissions updated successfully';
END $$;

-- Step 3: Verify the fix
SELECT 
  u.email,
  u.role,
  COUNT(rp.id) as permission_count
FROM users u
LEFT JOIN roles r ON r.name = u.role
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE u.email = 'mr1398463@gmail.com'
GROUP BY u.email, u.role;
