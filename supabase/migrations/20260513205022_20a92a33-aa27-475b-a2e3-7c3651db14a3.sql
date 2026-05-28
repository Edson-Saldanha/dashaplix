
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.contract_doc_status AS ENUM ('rascunho','gerado','enviado','assinado','cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sequence for auto-numbering
CREATE SEQUENCE IF NOT EXISTS public.contract_doc_seq START 1;

CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  status public.contract_doc_status NOT NULL DEFAULT 'rascunho',

  -- Contratante
  contratante_name TEXT NOT NULL,
  contratante_doc TEXT,
  contratante_address TEXT,
  contratante_city TEXT,
  contratante_state TEXT,
  contratante_zip TEXT,
  contratante_rep TEXT,
  contratante_email TEXT,
  contratante_phone TEXT,

  -- Contratada (defaults Value Agência)
  contratada_name TEXT NOT NULL DEFAULT 'VALUE AGÊNCIA LTDA',
  contratada_doc TEXT NOT NULL DEFAULT '58.673.996/0001-86',
  contratada_address TEXT NOT NULL DEFAULT 'Rua José Ferreira do Amaral, 1.105, São Geraldo II, Nova Serrana – MG, CEP 35520-304',
  contratada_city TEXT NOT NULL DEFAULT 'Nova Serrana',

  -- Contrato
  contract_type TEXT NOT NULL,
  platform TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration TEXT,
  loyalty_period TEXT,
  notice_days INT NOT NULL DEFAULT 30,
  cancel_fee_pct NUMERIC NOT NULL DEFAULT 20,

  -- Serviço
  service_description TEXT,
  accounts_count INT DEFAULT 1,
  ads_count INT,
  included_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_services JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pagamento
  total_value NUMERIC NOT NULL DEFAULT 0,
  monthly_value NUMERIC,
  payment_method TEXT,
  installments INT,
  due_date TEXT,
  payment_notes TEXT,
  per_account_billing BOOLEAN DEFAULT false,
  single_account BOOLEAN DEFAULT true,
  proportional_adjust BOOLEAN DEFAULT true,

  -- Atendimento
  service_hours TEXT DEFAULT 'Segunda a sexta-feira, das 9h às 18h',
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Cláusulas opcionais
  optional_clauses JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Internas
  internal_notes TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-number trigger
CREATE OR REPLACE FUNCTION public.assign_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CONTRATO-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.contract_doc_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_contract_number ON public.contract_documents;
CREATE TRIGGER trg_assign_contract_number
BEFORE INSERT ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.assign_contract_number();

DROP TRIGGER IF EXISTS trg_contract_documents_updated_at ON public.contract_documents;
CREATE TRIGGER trg_contract_documents_updated_at
BEFORE UPDATE ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_documents select" ON public.contract_documents
FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'comercial'::app_role,'financeiro'::app_role,'operacional'::app_role]));

CREATE POLICY "contract_documents insert" ON public.contract_documents
FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'comercial'::app_role]));

CREATE POLICY "contract_documents update" ON public.contract_documents
FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'comercial'::app_role]));

CREATE POLICY "contract_documents delete" ON public.contract_documents
FOR DELETE USING (has_role(auth.uid(),'admin'::app_role));
