-- Fix RLS policies for shift_templates
-- Date: 2025-12-03

-- Enable RLS
ALTER TABLE IF EXISTS public.shift_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can view shift templates" ON public.shift_templates;
DROP POLICY IF EXISTS "Authenticated users can manage shift templates" ON public.shift_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shift_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.shift_templates;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.shift_templates;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.shift_templates;

-- Create comprehensive policies
-- 1. Allow all authenticated users to view shift templates
CREATE POLICY "Authenticated users can view shift templates"
ON public.shift_templates
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow authenticated users to insert/update/delete shift templates
-- In a stricter production env, you might restrict this to specific roles (e.g. admin, manager)
-- But for now, we'll allow all authenticated users to unblock the feature
CREATE POLICY "Authenticated users can manage shift templates"
ON public.shift_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions to authenticated role
GRANT ALL ON public.shift_templates TO authenticated;
