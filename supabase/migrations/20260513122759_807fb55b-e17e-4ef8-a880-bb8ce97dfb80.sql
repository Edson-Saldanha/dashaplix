
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'comercial', 'operacional');
CREATE TYPE public.sale_status AS ENUM ('aprovada', 'pendente', 'recusada', 'reembolsada', 'chargeback');
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_atendimento', 'qualificado', 'reuniao_marcada', 'proposta_enviada', 'contrato_fechado', 'perdido', 'sem_resposta');
CREATE TYPE public.contract_status AS ENUM ('ativo', 'pendente', 'concluido', 'cancelado');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table - critical for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  product_name TEXT NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  status sale_status NOT NULL DEFAULT 'pendente',
  platform TEXT NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_code TEXT UNIQUE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sales_date_idx ON public.sales(sale_date DESC);
CREATE INDEX sales_platform_idx ON public.sales(platform);
CREATE INDEX sales_status_idx ON public.sales(status);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  responsible TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_date_idx ON public.expenses(expense_date DESC);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT,
  product_interest TEXT,
  current_revenue TEXT,
  main_difficulty TEXT,
  responsible TEXT,
  status lead_status NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON public.leads(status);

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  service TEXT NOT NULL,
  contract_value NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  closed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status contract_status NOT NULL DEFAULT 'ativo',
  responsible TEXT,
  contract_link TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  webhook_slug TEXT NOT NULL UNIQUE,
  security_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMPTZ,
  events_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook events
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX webhook_events_received_idx ON public.webhook_events(received_at DESC);

-- Field mappings
CREATE TABLE public.field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER integrations_updated BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  -- First user becomes admin, others operacional
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operacional');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_mappings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sales: admin + financeiro full; comercial+operacional read
CREATE POLICY "sales select" ON public.sales FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro','comercial','operacional']::app_role[]));
CREATE POLICY "sales insert" ON public.sales FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));
CREATE POLICY "sales update" ON public.sales FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));
CREATE POLICY "sales delete" ON public.sales FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Expenses: admin + financeiro
CREATE POLICY "expenses select" ON public.expenses FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));
CREATE POLICY "expenses insert" ON public.expenses FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));
CREATE POLICY "expenses update" ON public.expenses FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));
CREATE POLICY "expenses delete" ON public.expenses FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Leads: admin + comercial full; operacional read
CREATE POLICY "leads select" ON public.leads FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial','operacional']::app_role[]));
CREATE POLICY "leads insert" ON public.leads FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','comercial']::app_role[]));
CREATE POLICY "leads update" ON public.leads FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial']::app_role[]));
CREATE POLICY "leads delete" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Contracts: admin + comercial full; operacional + financeiro read
CREATE POLICY "contracts select" ON public.contracts FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial','financeiro','operacional']::app_role[]));
CREATE POLICY "contracts insert" ON public.contracts FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','comercial']::app_role[]));
CREATE POLICY "contracts update" ON public.contracts FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','comercial']::app_role[]));
CREATE POLICY "contracts delete" ON public.contracts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Integrations: admin only
CREATE POLICY "integrations admin all" ON public.integrations FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Webhook events: admin + financeiro read
CREATE POLICY "webhook events read" ON public.webhook_events FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']::app_role[]));

-- Field mappings: admin only
CREATE POLICY "field mappings admin" ON public.field_mappings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
