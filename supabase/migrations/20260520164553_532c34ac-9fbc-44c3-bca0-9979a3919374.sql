ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS platform TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_platform ON public.expenses(platform);