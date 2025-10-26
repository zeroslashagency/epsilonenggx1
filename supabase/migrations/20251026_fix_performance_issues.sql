-- Fix Performance Issues - 197 Supabase Advisors
-- Date: October 26, 2025
-- Fixes: RLS performance, duplicate indexes, slow queries

-- ============================================================================
-- FIX 1: Remove Duplicate Index on employee_raw_logs
-- ============================================================================
DROP INDEX IF EXISTS idx_clean_employee;
-- Keep idx_employee_raw_logs_employee_code (better name)

-- ============================================================================
-- FIX 2: Optimize RLS Policies - Replace auth.uid() with (SELECT auth.uid())
-- ============================================================================

-- profiles table
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- master_operations table
DROP POLICY IF EXISTS "Only admins can update master operations" ON public.master_operations;
CREATE POLICY "Only admins can update master operations" ON public.master_operations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete master operations" ON public.master_operations;
CREATE POLICY "Only admins can delete master operations" ON public.master_operations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'admin'
    )
  );

-- saved_orders table
DROP POLICY IF EXISTS "Users can view their own saved orders" ON public.saved_orders;
CREATE POLICY "Users can view their own saved orders" ON public.saved_orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own saved orders" ON public.saved_orders;
CREATE POLICY "Users can insert their own saved orders" ON public.saved_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own saved orders" ON public.saved_orders;
CREATE POLICY "Users can update their own saved orders" ON public.saved_orders
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own saved orders" ON public.saved_orders;
CREATE POLICY "Users can delete their own saved orders" ON public.saved_orders
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- schedule_outputs table
DROP POLICY IF EXISTS "Users can view their own schedule outputs" ON public.schedule_outputs;
CREATE POLICY "Users can view their own schedule outputs" ON public.schedule_outputs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own schedule outputs" ON public.schedule_outputs;
CREATE POLICY "Users can insert their own schedule outputs" ON public.schedule_outputs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own schedule outputs" ON public.schedule_outputs;
CREATE POLICY "Users can update their own schedule outputs" ON public.schedule_outputs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX 3: Add Missing Indexes for Foreign Keys
-- ============================================================================

-- These will speed up JOIN queries significantly
CREATE INDEX IF NOT EXISTS idx_employee_raw_logs_log_date ON public.employee_raw_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_saved_orders_user_id ON public.saved_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_outputs_user_id ON public.schedule_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Performance fixes applied successfully!';
  RAISE NOTICE '✅ Removed duplicate index: idx_clean_employee';
  RAISE NOTICE '✅ Optimized RLS policies with (SELECT auth.uid())';
  RAISE NOTICE '✅ Added missing indexes for foreign keys';
  RAISE NOTICE '📊 Run advisors again to verify fixes';
END $$;
