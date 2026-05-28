
-- Aplix Form: namespaced tables (aform_*)

CREATE TABLE public.aform_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#a855f7',
  button_text TEXT NOT NULL DEFAULT 'Enviar',
  initial_message TEXT,
  final_message TEXT DEFAULT 'Obrigado! Recebemos suas respostas.',
  public_slug TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aform_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_forms TO authenticated;
GRANT ALL ON public.aform_forms TO service_role;
ALTER TABLE public.aform_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform public active forms" ON public.aform_forms FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "aform owner forms all" ON public.aform_forms FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.aform_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.aform_forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_description TEXT,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aform_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_questions TO authenticated;
GRANT ALL ON public.aform_questions TO service_role;
ALTER TABLE public.aform_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform questions public" ON public.aform_questions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id = form_id AND f.status = 'active'));
CREATE POLICY "aform questions owner all" ON public.aform_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id = form_id AND f.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id = form_id AND f.owner_id = auth.uid()));

CREATE TABLE public.aform_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.aform_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.aform_question_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_question_options TO authenticated;
GRANT ALL ON public.aform_question_options TO service_role;
ALTER TABLE public.aform_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform options public" ON public.aform_question_options FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.aform_questions q JOIN public.aform_forms f ON f.id=q.form_id WHERE q.id=question_id AND f.status='active'));
CREATE POLICY "aform options owner all" ON public.aform_question_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_questions q JOIN public.aform_forms f ON f.id=q.form_id WHERE q.id=question_id AND f.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_questions q JOIN public.aform_forms f ON f.id=q.form_id WHERE q.id=question_id AND f.owner_id=auth.uid()));

CREATE TABLE public.aform_conditional_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.aform_forms(id) ON DELETE CASCADE,
  source_question_id UUID NOT NULL REFERENCES public.aform_questions(id) ON DELETE CASCADE,
  condition_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_question_id UUID REFERENCES public.aform_questions(id) ON DELETE SET NULL,
  tag_to_add TEXT,
  temperature_to_set TEXT,
  status_to_set TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aform_conditional_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_conditional_rules TO authenticated;
GRANT ALL ON public.aform_conditional_rules TO service_role;
ALTER TABLE public.aform_conditional_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform rules public" ON public.aform_conditional_rules FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id=form_id AND f.status='active'));
CREATE POLICY "aform rules owner all" ON public.aform_conditional_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id=form_id AND f.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id=form_id AND f.owner_id=auth.uid()));

CREATE TABLE public.aform_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.aform_forms(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  temperature TEXT,
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.aform_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_leads TO authenticated;
GRANT ALL ON public.aform_leads TO service_role;
ALTER TABLE public.aform_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform anon insert lead" ON public.aform_leads FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_forms f WHERE f.id=form_id AND f.status='active' AND f.owner_id=aform_leads.owner_id));
CREATE POLICY "aform leads owner all" ON public.aform_leads FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.aform_lead_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.aform_leads(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.aform_questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.aform_lead_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_lead_answers TO authenticated;
GRANT ALL ON public.aform_lead_answers TO service_role;
ALTER TABLE public.aform_lead_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform anon insert answer" ON public.aform_lead_answers FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l JOIN public.aform_forms f ON f.id=l.form_id WHERE l.id=lead_id AND f.status='active'));
CREATE POLICY "aform answers owner all" ON public.aform_lead_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()));

CREATE TABLE public.aform_lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.aform_leads(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.aform_lead_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_lead_tags TO authenticated;
GRANT ALL ON public.aform_lead_tags TO service_role;
ALTER TABLE public.aform_lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform anon insert tag" ON public.aform_lead_tags FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l JOIN public.aform_forms f ON f.id=l.form_id WHERE l.id=lead_id AND f.status='active'));
CREATE POLICY "aform tags owner all" ON public.aform_lead_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()));

CREATE TABLE public.aform_lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.aform_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_lead_notes TO authenticated;
GRANT ALL ON public.aform_lead_notes TO service_role;
ALTER TABLE public.aform_lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform notes owner all" ON public.aform_lead_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()));

CREATE TABLE public.aform_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.aform_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.aform_lead_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aform_lead_events TO authenticated;
GRANT ALL ON public.aform_lead_events TO service_role;
ALTER TABLE public.aform_lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aform anon insert event" ON public.aform_lead_events FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l JOIN public.aform_forms f ON f.id=l.form_id WHERE l.id=lead_id AND f.status='active'));
CREATE POLICY "aform events owner all" ON public.aform_lead_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()));

-- updated_at triggers (reuse existing set_updated_at function from host)
CREATE TRIGGER aform_set_updated_at_forms BEFORE UPDATE ON public.aform_forms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER aform_set_updated_at_leads BEFORE UPDATE ON public.aform_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Collaborators
CREATE TABLE public.aform_form_collaborators (
  form_id UUID NOT NULL REFERENCES public.aform_forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (form_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.aform_form_collaborators TO authenticated;
GRANT ALL ON public.aform_form_collaborators TO service_role;
ALTER TABLE public.aform_form_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.aform_is_collaborator(_form_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aform_form_collaborators WHERE form_id=_form_id AND user_id=_user_id);
$$;
CREATE OR REPLACE FUNCTION public.aform_is_owner(_form_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aform_forms WHERE id=_form_id AND owner_id=_user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.aform_is_collaborator(UUID,UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aform_is_owner(UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aform_is_collaborator(UUID,UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aform_is_owner(UUID,UUID) TO authenticated, service_role;

CREATE POLICY "aform owner manages collabs" ON public.aform_form_collaborators FOR ALL TO authenticated
  USING (public.aform_is_owner(form_id, auth.uid())) WITH CHECK (public.aform_is_owner(form_id, auth.uid()));
CREATE POLICY "aform collab sees own row" ON public.aform_form_collaborators FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "aform collab read forms" ON public.aform_forms FOR SELECT TO authenticated
  USING (public.aform_is_collaborator(id, auth.uid()));
CREATE POLICY "aform collab update forms" ON public.aform_forms FOR UPDATE TO authenticated
  USING (public.aform_is_collaborator(id, auth.uid())) WITH CHECK (public.aform_is_collaborator(id, auth.uid()));
CREATE POLICY "aform collab questions" ON public.aform_questions FOR ALL TO authenticated
  USING (public.aform_is_collaborator(form_id, auth.uid())) WITH CHECK (public.aform_is_collaborator(form_id, auth.uid()));
CREATE POLICY "aform collab options" ON public.aform_question_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_questions q WHERE q.id=question_id AND public.aform_is_collaborator(q.form_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_questions q WHERE q.id=question_id AND public.aform_is_collaborator(q.form_id, auth.uid())));
CREATE POLICY "aform collab rules" ON public.aform_conditional_rules FOR ALL TO authenticated
  USING (public.aform_is_collaborator(form_id, auth.uid())) WITH CHECK (public.aform_is_collaborator(form_id, auth.uid()));
CREATE POLICY "aform collab leads" ON public.aform_leads FOR ALL TO authenticated
  USING (public.aform_is_collaborator(form_id, auth.uid())) WITH CHECK (public.aform_is_collaborator(form_id, auth.uid()));
CREATE POLICY "aform collab answers" ON public.aform_lead_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())));
CREATE POLICY "aform collab events" ON public.aform_lead_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())));
CREATE POLICY "aform collab notes" ON public.aform_lead_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())));
CREATE POLICY "aform collab tags" ON public.aform_lead_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aform_leads l WHERE l.id=lead_id AND public.aform_is_collaborator(l.form_id, auth.uid())));
