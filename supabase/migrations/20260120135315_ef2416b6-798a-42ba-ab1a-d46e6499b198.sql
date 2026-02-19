-- Drop existing policies on business_profiles
DROP POLICY IF EXISTS "Users can create their company profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete their company profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update their company profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view their company profile" ON public.business_profiles;

-- New RLS Policies for business_profiles

-- All users in company can READ their company profile
CREATE POLICY "Users can view their company profile"
ON public.business_profiles
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Only company_admin can INSERT company profile
CREATE POLICY "Admins can create company profile"
ON public.business_profiles
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'company_admin'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

-- Only company_admin can UPDATE company profile
CREATE POLICY "Admins can update company profile"
ON public.business_profiles
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'company_admin'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

-- Only master_admin can DELETE company profile
CREATE POLICY "Master admins can delete company profile"
ON public.business_profiles
FOR DELETE
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Master admin bypass for all operations
CREATE POLICY "Master admins have full access to all profiles"
ON public.business_profiles
FOR ALL
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));