-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Company admins can view roles in company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new policy: Master admins can view ALL roles (including other master_admins)
CREATE POLICY "Master admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'master_admin'));

-- Recreate: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Recreate: Company admins can view roles in their company
CREATE POLICY "Company admins can view roles in company"
ON public.user_roles
FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND has_role(auth.uid(), 'company_admin')
);

-- Also add policy for master admins to manage ALL roles
DROP POLICY IF EXISTS "Master admins can manage all roles" ON public.user_roles;
CREATE POLICY "Master admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));