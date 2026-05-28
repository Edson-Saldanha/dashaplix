UPDATE public.sales
SET platform_fee = ABS(platform_fee),
    net_amount = gross_amount - ABS(platform_fee)
WHERE platform_fee < 0 OR net_amount > gross_amount;