UPDATE public.sales
SET gross_amount = gross_amount / 100,
    net_amount = net_amount / 100,
    platform_fee = platform_fee / 100
WHERE platform = 'Kiwify'
  AND id = 'e230fc32-e31e-4f18-a5f5-26d627d1445e';