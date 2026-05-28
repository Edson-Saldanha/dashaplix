ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installments_count integer NOT NULL DEFAULT 1;