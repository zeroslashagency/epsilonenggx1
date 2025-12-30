-- 1. Create shift_rotation_steps table
CREATE TABLE IF NOT EXISTS public.shift_rotation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    base_shift_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL,
    custom_name TEXT,
    start_time TIME,
    end_time TIME,
    work_days INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add work_days to shift_templates
ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS work_days INT[] DEFAULT '{0,1,2,3,4,5,6}';

-- 3. Migration Logic (Moving data from JSON to structured columns)
-- This is a one-way migration script

-- Step 3a: Extract work_days for Fixed Shifts
UPDATE public.shift_templates
SET work_days = ARRAY(
    SELECT json_array_elements_text(COALESCE(pattern->'work_days', '[0,1,2,3,4,5,6]'))::int
)
WHERE type = 'fixed' AND pattern IS NOT NULL;

-- Step 3b: Populate rotation steps from JSON pattern
-- We do this using a lateral join to expand the JSON array
INSERT INTO public.shift_rotation_steps (template_id, step_order, custom_name, start_time, end_time, work_days)
SELECT 
    st.id,
    p.ordinality - 1,
    p.value->>'shift_name',
    (p.value->>'start_time')::TIME,
    (p.value->>'end_time')::TIME,
    COALESCE(
        ARRAY(SELECT json_array_elements_text(COALESCE(p.value->'work_days', '[0,1,2,3,4,5,6]'))::int),
        '{0,1,2,3,4,5,6}'
    )
FROM public.shift_templates st,
jsonb_array_elements(st.pattern) WITH ORDINALITY AS p(value, ordinality)
WHERE st.type = 'rotation' AND jsonb_typeof(st.pattern) = 'array';

-- 4. Clean up (Dropping obsolete columns per user request)
ALTER TABLE public.shift_templates DROP COLUMN IF EXISTS pattern;
ALTER TABLE public.shift_templates DROP COLUMN IF EXISTS weeks_pattern;
ALTER TABLE public.shift_templates DROP COLUMN IF EXISTS role_tags;
ALTER TABLE public.shift_templates DROP COLUMN IF EXISTS min_staffing;

-- Enable RLS
ALTER TABLE public.shift_rotation_steps ENABLE ROW LEVEL SECURITY;

-- Simple Policies
CREATE POLICY "Allow authenticated view" ON public.shift_rotation_steps FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.shift_rotation_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.shift_rotation_steps FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.shift_rotation_steps FOR DELETE USING (true);
