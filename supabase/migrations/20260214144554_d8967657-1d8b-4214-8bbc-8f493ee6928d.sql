CREATE POLICY "Office managers can view company submissions"
ON public.knowledge_submissions
FOR SELECT
USING (
  has_role(auth.uid(), 'office_manager'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);