-- =====================================================
-- ROLLBACK: Restore user_permissions table
-- Date: 2025-10-20
-- Purpose: Rollback Pure RBAC migration if needed
-- =====================================================

-- WARNING: Only run this if you need to rollback the migration!
-- This will restore the user_permissions table from backup

-- STEP 1: Recreate user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect VARCHAR(10) NOT NULL CHECK (effect IN ('grant', 'revoke')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- STEP 2: Create indexes
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX idx_user_permissions_effect ON user_permissions(effect);

-- STEP 3: Restore data from backup
INSERT INTO user_permissions (user_id, permission_id, effect, created_at)
SELECT 
    user_id,
    permission_id,
    effect,
    backup_timestamp as created_at
FROM user_permissions_backup_20251020
WHERE user_id IS NOT NULL 
  AND permission_id IS NOT NULL
  AND effect IS NOT NULL
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- STEP 4: Verify restoration
SELECT 
    COUNT(*) as restored_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN effect = 'grant' THEN 1 END) as grants,
    COUNT(CASE WHEN effect = 'revoke' THEN 1 END) as revokes
FROM user_permissions;

-- STEP 5: Enable RLS (if needed)
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own permissions"
    ON user_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions"
    ON user_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Super Admin', 'Admin')
        )
    );

-- SUCCESS MESSAGE
DO $$
DECLARE
    restored_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO restored_count FROM user_permissions;
    RAISE NOTICE '✅ Rollback complete!';
    RAISE NOTICE 'Restored % permission records', restored_count;
    RAISE NOTICE '⚠️  Remember to also rollback code changes!';
END $$;

-- IMPORTANT: After running this rollback, you must also:
-- 1. Revert code changes in git
-- 2. Redeploy the application with ABAC logic
-- 3. Test thoroughly before going to production
