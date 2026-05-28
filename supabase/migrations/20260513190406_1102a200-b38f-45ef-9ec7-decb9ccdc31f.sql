UPDATE public.expenses
SET category = 'SUA LOJA DECORADA (PREMIUM)',
    description = REPLACE(description, 'SUA LOJA DECORACADA', 'SUA LOJA DECORADA (PREMIUM)')
WHERE category = 'SUA LOJA DECORACADA' OR description ILIKE '%SUA LOJA DECORACADA%';