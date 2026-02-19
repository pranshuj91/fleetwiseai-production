-- Add policy for master admins to view all user roles
CREATE POLICY "Master admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Add policy for company admins to view roles in their company
CREATE POLICY "Company admins can view roles in company" 
ON public.user_roles 
FOR SELECT 
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'company_admin'::app_role)
);