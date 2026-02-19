-- Drop existing restrictive policy for viewing profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for admins to view profiles in their company
CREATE POLICY "Admins can view profiles in their company" 
ON public.profiles 
FOR SELECT 
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'company_admin'::app_role)
);

-- Create policy for master admins to view all profiles
CREATE POLICY "Master admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'master_admin'::app_role));