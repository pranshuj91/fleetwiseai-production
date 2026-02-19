-- Step 1: Create app_role enum
CREATE TYPE public.app_role AS ENUM ('master_admin', 'company_admin', 'office_manager', 'shop_supervisor', 'technician');

-- Step 2: Create user_roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'technician',
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, company_id)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: Create function to get user's company_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 6: Create custom JWT hook to include company_id in claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  user_company_id UUID;
  user_role TEXT;
BEGIN
  -- Get user's company_id
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE user_id = (event->>'user_id')::UUID;

  -- Get user's primary role
  SELECT role::TEXT INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::UUID
  ORDER BY 
    CASE role 
      WHEN 'master_admin' THEN 1 
      WHEN 'company_admin' THEN 2 
      WHEN 'office_manager' THEN 3
      WHEN 'shop_supervisor' THEN 4
      WHEN 'technician' THEN 5
    END
  LIMIT 1;

  -- Build claims
  claims := event->'claims';
  
  IF user_company_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_id}', to_jsonb(user_company_id::TEXT));
  END IF;
  
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  -- Return modified event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Step 7: Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Step 8: Revoke execute from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Step 9: RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Company admins can manage roles in their company"
ON public.user_roles
FOR ALL
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'company_admin')
);

-- Step 10: Update handle_new_user to also create a role entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Create role entry in separate user_roles table
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (NEW.id, 'company_admin', new_company_id);

  RETURN NEW;
END;
$$;