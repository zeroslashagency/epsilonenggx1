-- Fix roles table schema
-- Add missing columns for RBAC functionality

-- Add is_manufacturing_role column
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS is_manufacturing_role BOOLEAN DEFAULT false;

-- Add permissions_json column
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS permissions_json JSONB;

-- Add updated_at column
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON roles USING GIN (permissions_json);
CREATE INDEX IF NOT EXISTS idx_roles_manufacturing ON roles(is_manufacturing_role);

-- Update existing roles with default values
UPDATE roles 
SET 
  is_manufacturing_role = CASE 
    WHEN name IN ('super_admin', 'operator') THEN true 
    ELSE false 
  END,
  updated_at = NOW()
WHERE is_manufacturing_role IS NULL;

-- Add comments
COMMENT ON COLUMN roles.is_manufacturing_role IS 'Flag to indicate if this role is for manufacturing users';
COMMENT ON COLUMN roles.permissions_json IS 'Detailed permission matrix stored as JSON';
COMMENT ON COLUMN roles.updated_at IS 'Timestamp of last update';

-- Show results
SELECT id, name, is_manufacturing_role, 
       CASE WHEN permissions_json IS NULL THEN 'No permissions' ELSE 'Has permissions' END as permissions_status
FROM roles
ORDER BY name;
