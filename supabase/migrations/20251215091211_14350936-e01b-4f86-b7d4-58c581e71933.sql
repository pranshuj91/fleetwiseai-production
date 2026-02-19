-- Update handle_new_user function to create company and link to profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company first
  INSERT INTO public.companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'))
  RETURNING id INTO new_company_id;

  -- Create profile with company reference
  INSERT INTO public.profiles (user_id, email, full_name, username, company_name, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'company_name',
    new_company_id,
    'company_admin'
  );
  RETURN NEW;
END;
$$;