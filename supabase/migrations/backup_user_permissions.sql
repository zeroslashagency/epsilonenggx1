-- =====================================================
-- BACKUP: User Permissions Table
-- Date: 2025-10-20
-- Purpose: Backup before migrating to Pure RBAC
-- =====================================================

-- Create backup table with timestamp
CREATE TABLE IF NOT EXISTS user_permissions_backup_20251020 AS
SELECT 
  up.*,
  p.code as permission_code,
  p.description as permission_description,
  prof.email as user_email,
  prof.full_name as user_name,
  prof.role as user_role,
  NOW() as backup_timestamp
FROM user_permissions up
LEFT JOIN permissions p ON up.permission_id = p.id
LEFT JOIN profiles prof ON up.user_id = prof.id;

-- Create index for faster lookups
CREATE INDEX idx_user_permissions_backup_user_id 
ON user_permissions_backup_20251020(user_id);

-- Export to CSV (run this manually if needed)
-- COPY user_permissions_backup_20251020 TO '/tmp/user_permissions_backup.csv' CSV HEADER;

-- Verify backup
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN effect = 'grant' THEN 1 END) as grants,
  COUNT(CASE WHEN effect = 'revoke' THEN 1 END) as revokes
FROM user_permissions_backup_20251020;

-- Show affected users
SELECT 
  user_email,
  user_name,
  user_role,
  COUNT(*) as custom_permissions,
  STRING_AGG(permission_code || ' (' || effect || ')', ', ') as permissions
FROM user_permissions_backup_20251020
GROUP BY user_email, user_name, user_role
ORDER BY custom_permissions DESC;

COMMENT ON TABLE user_permissions_backup_20251020 IS 
'Backup of user_permissions table before migration to Pure RBAC on 2025-10-20';
