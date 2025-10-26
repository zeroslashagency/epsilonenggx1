-- =====================================================
-- MIGRATION: Drop user_permissions table (Pure RBAC)
-- Date: 2025-10-20
-- Purpose: Convert from Hybrid RBAC+ABAC to Pure RBAC
-- =====================================================

-- STEP 1: Backup existing data (already done in backup_user_permissions.sql)
-- Run backup_user_permissions.sql BEFORE running this migration!

-- STEP 2: Drop foreign key constraints (if any)
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_permissions_user_id_fkey'
    ) THEN
        ALTER TABLE user_permissions DROP CONSTRAINT user_permissions_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_permissions_permission_id_fkey'
    ) THEN
        ALTER TABLE user_permissions DROP CONSTRAINT user_permissions_permission_id_fkey;
    END IF;
END $$;

-- STEP 3: Drop indexes
DROP INDEX IF EXISTS idx_user_permissions_user_id;
DROP INDEX IF EXISTS idx_user_permissions_permission_id;
DROP INDEX IF EXISTS idx_user_permissions_effect;

-- STEP 4: Drop the user_permissions table
DROP TABLE IF EXISTS user_permissions CASCADE;

-- STEP 5: Verify table is dropped
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_permissions'
    ) THEN
        RAISE EXCEPTION 'Failed to drop user_permissions table';
    ELSE
        RAISE NOTICE 'Successfully dropped user_permissions table';
    END IF;
END $$;

-- STEP 6: Clean up any references in audit logs (optional)
-- Comment this out if you want to keep audit history
-- DELETE FROM audit_logs WHERE action IN ('permission_grant', 'permission_revoke');

-- STEP 7: Verify remaining RBAC tables are intact
SELECT 
    'roles' as table_name, 
    COUNT(*) as record_count 
FROM roles
UNION ALL
SELECT 
    'role_permissions' as table_name, 
    COUNT(*) as record_count 
FROM role_permissions
UNION ALL
SELECT 
    'user_roles' as table_name, 
    COUNT(*) as record_count 
FROM user_roles
UNION ALL
SELECT 
    'permissions' as table_name, 
    COUNT(*) as record_count 
FROM permissions;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! System is now Pure RBAC.';
    RAISE NOTICE 'All permissions are now managed through roles only.';
    RAISE NOTICE 'Backup table: user_permissions_backup_20251020';
END $$;
