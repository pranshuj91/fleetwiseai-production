-- Remove blanket master_admin access policies from tenant-specific tables
-- Super Admins must impersonate a company to see tenant data

-- Drop existing master_admin policies on tenant tables
DROP POLICY IF EXISTS "Master admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Master admins can manage all trucks" ON public.trucks;
DROP POLICY IF EXISTS "Master admins can manage all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Master admins can manage all tasks" ON public.work_order_tasks;
DROP POLICY IF EXISTS "Master admins can manage all maintenance records" ON public.maintenance_records;

-- Super Admins can still manage companies globally (for company management page)
-- The existing "Master admins can manage all companies" policy remains

-- Super Admins can still manage profiles globally (for user management)
-- The existing "Master admins can manage all profiles" policy remains

-- Note: When Super Admins impersonate a company, the frontend passes
-- the impersonated company_id in queries, which matches the existing
-- company-scoped policies for regular users