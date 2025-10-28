#!/bin/bash

# CRITICAL FIX: Create audit_logs table in Supabase
# This will fix the "No activity logs found" issue

echo "🔧 Creating audit_logs table in Supabase..."

# Read the SQL migration
SQL_CONTENT=$(cat <<'EOF'
-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id UUID,
  action VARCHAR(100) NOT NULL,
  ip VARCHAR(45),
  meta_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON public.audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Service role can manage all audit logs" ON audit_logs;
CREATE POLICY "Service role can manage all audit logs" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
EOF
)

# Get Supabase credentials from .env.local
source .env.local

# Project ref from URL
PROJECT_REF="sxnaopzgaddvziplrlbe"

echo "📊 Project: $PROJECT_REF"
echo "🔑 Using service role key from .env.local"

# Execute SQL using Supabase REST API
curl -X POST "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo ""
echo "✅ SQL executed!"
echo ""
echo "🧪 Testing: Verify table exists"
curl -X GET "https://${PROJECT_REF}.supabase.co/rest/v1/audit_logs?limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"

echo ""
echo ""
echo "✅ DONE! Activity logs should now work."
echo "Test by changing a user's role and checking Recent Activity tab."
