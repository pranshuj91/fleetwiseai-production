-- Fix RLS policies for profiles and user_roles to allow Company Admins to see team members

-- Drop and recreate profiles SELECT policy for company admins
DROP POLICY IF EXISTS "Admins can view profiles in their company" ON public.profiles;
CREATE POLICY "Admins can view profiles in their company" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can always see their own profile
  (auth.uid() = user_id)
  OR
  -- Company admins can see all profiles in their company
  (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role))
);

-- Drop and recreate user_roles SELECT policy for company admins  
DROP POLICY IF EXISTS "Company admins can view roles in company" ON public.user_roles;
CREATE POLICY "Company admins can view roles in company" 
ON public.user_roles 
FOR SELECT 
USING (
  -- User can always see their own role
  (auth.uid() = user_id)
  OR
  -- Company admins can see all roles in their company
  (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'::app_role))
);