
CREATE TYPE public.mentorado_status AS ENUM ('ativo', 'reembolso', 'pendente', 'encerrado', 'cancelado');

CREATE TABLE public.mentorados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  product text,
  plan text,
  payment_method text,
  purchase_date date,
  start_date date,
  expiration_date date,
  status public.mentorado_status NOT NULL DEFAULT 'ativo',
  onboarding_done boolean NOT NULL DEFAULT false,
  added_to_course boolean NOT NULL DEFAULT false,
  added_to_group boolean NOT NULL DEFAULT false,
  checklist_done boolean NOT NULL DEFAULT false,
  individual_meetings text,
  meeting_1_date date,
  meeting_2_date date,
  plaquinha boolean NOT NULL DEFAULT false,
  kit_brinde boolean NOT NULL DEFAULT false,
  renewed boolean NOT NULL DEFAULT false,
  responsible text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentorados select" ON public.mentorados FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial','financeiro','operacional']::app_role[]));

CREATE POLICY "mentorados insert" ON public.mentorados FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','comercial','operacional']::app_role[]));

CREATE POLICY "mentorados update" ON public.mentorados FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial','operacional']::app_role[]));

CREATE POLICY "mentorados delete" ON public.mentorados FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER mentorados_updated_at
  BEFORE UPDATE ON public.mentorados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_mentorados_status ON public.mentorados(status);
CREATE INDEX idx_mentorados_expiration ON public.mentorados(expiration_date);
