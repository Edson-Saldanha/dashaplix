UPDATE public.expenses
SET category = trim(split_part(substring(description from '^Tráfego\s+—\s+([^·]+)'), '·', 1))
WHERE category = 'Tráfego'
  AND description ~ '^Tráfego\s+—\s+';

UPDATE public.expenses SET category = 'Outros' WHERE category = 'Tráfego';