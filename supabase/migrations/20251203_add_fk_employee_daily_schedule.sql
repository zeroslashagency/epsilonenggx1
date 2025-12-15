-- Add foreign key to employee_daily_schedule
-- Date: 2025-12-03

ALTER TABLE public.employee_daily_schedule
ADD CONSTRAINT fk_employee_daily_schedule_employee_code
FOREIGN KEY (employee_code)
REFERENCES public.employee_master(employee_code)
ON DELETE CASCADE;
