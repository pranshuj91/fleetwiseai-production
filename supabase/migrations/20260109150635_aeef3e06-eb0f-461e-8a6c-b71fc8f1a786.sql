-- Remove master admin access to profiles and user_roles
-- Super Admin should only see companies, not users/roles/teams

-- Drop existing master admin policies on profiles
DROP POLICY IF EXISTS "Master admins can view all profiles" ON public.profiles;

-- Drop existing master admin policies on user_roles
DROP POLICY IF EXISTS "Master admins can view all roles" ON public.user_roles;

-- Ensure company admins can properly view profiles in their company (recreate for clarity)
DROP POLICY IF EXISTS "Admins can view profiles in their company" ON public.profiles;
CREATE POLICY "Admins can view profiles in their company" 
ON public.profiles 
FOR SELECT 
USING (
  (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role))
  OR (auth.uid() = user_id)
);

-- Ensure company admins can properly view user_roles in their company (recreate for clarity)
DROP POLICY IF EXISTS "Company admins can view roles in company" ON public.user_roles;
CREATE POLICY "Company admins can view roles in company" 
ON public.user_roles 
FOR SELECT 
USING (
  (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role))
  OR (auth.uid() = user_id)
);