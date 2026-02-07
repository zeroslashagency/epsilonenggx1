-- Phase 1: Shift Management schema alignment

-- 1) Extend shift_templates
ALTER TABLE public.shift_templates
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS overtime_threshold NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 2) Coverage targets per shift/department/day
CREATE TABLE IF NOT EXISTS public.shift_coverage_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  department TEXT,
  day_of_week INT NOT NULL DEFAULT 0, -- 0=Sun..6=Sat
  target_count INT NOT NULL DEFAULT 0,
  effective_start DATE,
  effective_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Indexes for core queries
CREATE INDEX IF NOT EXISTS idx_shift_templates_name ON public.shift_templates (name);
CREATE INDEX IF NOT EXISTS idx_shift_templates_type ON public.shift_templates (type);
CREATE INDEX IF NOT EXISTS idx_shift_templates_archived ON public.shift_templates (is_archived);

CREATE INDEX IF NOT EXISTS idx_shift_rotation_steps_template_order ON public.shift_rotation_steps (template_id, step_order);

CREATE INDEX IF NOT EXISTS idx_employee_shift_assignments_template ON public.employee_shift_assignments (shift_template_id);
CREATE INDEX IF NOT EXISTS idx_employee_shift_assignments_employee ON public.employee_shift_assignments (employee_code);

CREATE INDEX IF NOT EXISTS idx_employee_daily_schedule_employee_date ON public.employee_daily_schedule (employee_code, work_date);
CREATE INDEX IF NOT EXISTS idx_employee_daily_schedule_date ON public.employee_daily_schedule (work_date);

-- 4) RLS for coverage targets
ALTER TABLE public.shift_coverage_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated view" ON public.shift_coverage_targets
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated insert" ON public.shift_coverage_targets
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated update" ON public.shift_coverage_targets
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated delete" ON public.shift_coverage_targets
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Realtime publication for scheduling tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'employee_daily_schedule'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_daily_schedule;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'employee_shift_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_shift_assignments;
  END IF;
END $$;
