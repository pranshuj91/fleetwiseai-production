
-- Knowledge Submissions table for multi-level approval workflow
CREATE TABLE public.knowledge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_by_name TEXT NOT NULL,
  submitted_by_role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'diagnosis',
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending_company_admin'
    CHECK (status IN ('pending_company_admin','pending_super_admin','approved_final','rejected_by_company_admin','rejected_by_super_admin')),
  company_admin_id UUID,
  company_admin_name TEXT,
  company_admin_reviewed_at TIMESTAMPTZ,
  company_admin_notes TEXT,
  super_admin_id UUID,
  super_admin_reviewed_at TIMESTAMPTZ,
  super_admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.knowledge_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: own submissions, company admin sees company, master admin sees forwarded+
CREATE POLICY "Users can view own submissions"
  ON public.knowledge_submissions FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR (has_role(auth.uid(), 'company_admin'::app_role) AND company_id = get_user_company_id(auth.uid()))
    OR (has_role(auth.uid(), 'master_admin'::app_role) AND status IN ('pending_super_admin','approved_final','rejected_by_super_admin'))
  );

-- INSERT: authenticated users with matching company_id
CREATE POLICY "Users can submit knowledge"
  ON public.knowledge_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND company_id = get_user_company_id(auth.uid())
  );

-- UPDATE: company admin for own company, master admin for forwarded items
CREATE POLICY "Admins can review submissions"
  ON public.knowledge_submissions FOR UPDATE
  USING (
    (has_role(auth.uid(), 'company_admin'::app_role) AND company_id = get_user_company_id(auth.uid()))
    OR (has_role(auth.uid(), 'master_admin'::app_role) AND status IN ('pending_super_admin'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_submissions_updated_at
  BEFORE UPDATE ON public.knowledge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
