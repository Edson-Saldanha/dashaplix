DROP POLICY IF EXISTS "aform collab leads" ON public.aform_leads;

CREATE POLICY "aform collab leads select"
ON public.aform_leads
FOR SELECT
TO authenticated
USING (public.aform_is_collaborator(form_id, auth.uid()));

CREATE POLICY "aform collab leads update"
ON public.aform_leads
FOR UPDATE
TO authenticated
USING (public.aform_is_collaborator(form_id, auth.uid()))
WITH CHECK (public.aform_is_collaborator(form_id, auth.uid()));

CREATE POLICY "aform collab leads delete"
ON public.aform_leads
FOR DELETE
TO authenticated
USING (public.aform_is_collaborator(form_id, auth.uid()));

CREATE POLICY "aform collab leads insert"
ON public.aform_leads
FOR INSERT
TO authenticated
WITH CHECK (
  public.aform_is_collaborator(form_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.aform_forms f
    WHERE f.id = aform_leads.form_id
      AND f.owner_id = aform_leads.owner_id
  )
);