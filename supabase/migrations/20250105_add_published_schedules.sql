-- Migration: Add published_schedules table for schedule publishing feature
-- Date: 2025-01-05

-- Create published_schedules table
CREATE TABLE IF NOT EXISTS public.published_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id TEXT NOT NULL UNIQUE,
  schedule_name TEXT NOT NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  schedule_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_published_schedules_schedule_id ON public.published_schedules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_published_schedules_published_by ON public.published_schedules(published_by);
CREATE INDEX IF NOT EXISTS idx_published_schedules_published_at ON public.published_schedules(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_schedules_status ON public.published_schedules(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_published_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_published_schedules_updated_at
  BEFORE UPDATE ON public.published_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_published_schedules_updated_at();

-- Add soft delete columns to scheduling_outputs table
ALTER TABLE public.scheduling_outputs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS schedule_id TEXT;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_scheduling_outputs_deleted_at ON public.scheduling_outputs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduling_outputs_schedule_id ON public.scheduling_outputs(schedule_id);

-- Enable RLS on published_schedules
ALTER TABLE public.published_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for published_schedules

-- Allow authenticated users to view published schedules
CREATE POLICY "Allow authenticated users to view published schedules"
  ON public.published_schedules
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users with schedule.approve permission to insert published schedules
CREATE POLICY "Allow users with approve permission to publish schedules"
  ON public.published_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role_id = rp.role_id
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'schedule.approve'
    )
  );

-- Allow users with schedule.approve permission to update published schedules
CREATE POLICY "Allow users with approve permission to update published schedules"
  ON public.published_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role_id = rp.role_id
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'schedule.approve'
    )
  );

-- Allow users with schedule.delete permission to delete published schedules
CREATE POLICY "Allow users with delete permission to delete published schedules"
  ON public.published_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role_id = rp.role_id
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'schedule.delete'
    )
  );

-- Grant permissions
GRANT SELECT ON public.published_schedules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.published_schedules TO authenticated;

-- Add comment
COMMENT ON TABLE public.published_schedules IS 'Stores published production schedules with approval tracking';
