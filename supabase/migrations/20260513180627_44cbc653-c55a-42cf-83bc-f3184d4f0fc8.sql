CREATE TABLE public.user_page_access (
  user_id uuid NOT NULL,
  page text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page)
);

ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages page access"
  ON public.user_page_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users see own page access"
  ON public.user_page_access FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));