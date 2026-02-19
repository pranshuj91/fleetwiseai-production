-- Drop existing overly permissive update policy
DROP POLICY IF EXISTS "Users can update their company" ON companies;

-- Create new policy: Only company_admin and master_admin can update company details
CREATE POLICY "Admins can update their company"
ON companies FOR UPDATE
USING (
  (id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role))
  OR has_role(auth.uid(), 'master_admin'::app_role)
);