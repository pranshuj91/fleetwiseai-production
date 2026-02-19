-- Allow company_id to be null for master_admin users in user_roles table
-- This enables Super Admins to be created without a company assignment
ALTER TABLE public.user_roles ALTER COLUMN company_id DROP NOT NULL;

-- Add a check constraint to ensure company_id is required for non-master_admin roles
-- master_admin can have company_id as either null OR a valid company ID
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_company_id_required_for_non_master_admin
CHECK (
  role = 'master_admin' OR company_id IS NOT NULL
);