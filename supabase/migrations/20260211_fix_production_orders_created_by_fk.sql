-- Ensure auth user hard-deletes do not fail because of production_orders.created_by
-- references. Keep historical orders but null out creator when auth user is deleted.

ALTER TABLE IF EXISTS public.production_orders
  DROP CONSTRAINT IF EXISTS production_orders_created_by_fkey;

ALTER TABLE IF EXISTS public.production_orders
  ADD CONSTRAINT production_orders_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

