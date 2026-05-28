-- Tabela de gastos diários do Meta Ads
CREATE TABLE public.meta_ads_spend (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id TEXT NOT NULL,
  spend_date DATE NOT NULL,
  spend NUMERIC NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  currency TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (ad_account_id, spend_date)
);

CREATE INDEX idx_meta_ads_spend_date ON public.meta_ads_spend (spend_date DESC);

ALTER TABLE public.meta_ads_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta ads read"
ON public.meta_ads_spend FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'financeiro'::app_role]));

CREATE POLICY "meta ads admin all"
ON public.meta_ads_spend FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meta_ads_spend_updated_at
BEFORE UPDATE ON public.meta_ads_spend
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de configuração (qual conta sincronizar)
CREATE TABLE public.meta_ads_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ads_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta config read"
ON public.meta_ads_config FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'financeiro'::app_role]));

CREATE POLICY "meta config admin all"
ON public.meta_ads_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meta_ads_config_updated_at
BEFORE UPDATE ON public.meta_ads_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();