
-- Allow master_admin to access all company data during impersonation

-- ============ TRUCKS ============
DROP POLICY IF EXISTS "Users can view trucks in their company" ON public.trucks;
CREATE POLICY "Users can view trucks in their company" ON public.trucks FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can create trucks in their company" ON public.trucks;
CREATE POLICY "Users can create trucks in their company" ON public.trucks FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update trucks in their company" ON public.trucks;
CREATE POLICY "Users can update trucks in their company" ON public.trucks FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete trucks in their company" ON public.trucks;
CREATE POLICY "Users can delete trucks in their company" ON public.trucks FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ WORK_ORDERS ============
DROP POLICY IF EXISTS "Users can view work orders in their company" ON public.work_orders;
CREATE POLICY "Users can view work orders in their company" ON public.work_orders FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can create work orders in their company" ON public.work_orders;
CREATE POLICY "Users can create work orders in their company" ON public.work_orders FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update work orders in their company" ON public.work_orders;
CREATE POLICY "Users can update work orders in their company" ON public.work_orders FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete work orders in their company" ON public.work_orders;
CREATE POLICY "Users can delete work orders in their company" ON public.work_orders FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ CUSTOMERS ============
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
CREATE POLICY "Users can view customers in their company" ON public.customers FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can create customers in their company" ON public.customers;
CREATE POLICY "Users can create customers in their company" ON public.customers FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update customers in their company" ON public.customers;
CREATE POLICY "Users can update customers in their company" ON public.customers FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete customers in their company" ON public.customers;
CREATE POLICY "Users can delete customers in their company" ON public.customers FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ WORK_ORDER_TASKS ============
DROP POLICY IF EXISTS "Users can view tasks in their company" ON public.work_order_tasks;
CREATE POLICY "Users can view tasks in their company" ON public.work_order_tasks FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can create tasks in their company" ON public.work_order_tasks;
CREATE POLICY "Users can create tasks in their company" ON public.work_order_tasks FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update tasks in their company" ON public.work_order_tasks;
CREATE POLICY "Users can update tasks in their company" ON public.work_order_tasks FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete tasks in their company" ON public.work_order_tasks;
CREATE POLICY "Users can delete tasks in their company" ON public.work_order_tasks FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ WORK_ORDER_PARTS ============
DROP POLICY IF EXISTS "Users can view parts for their company" ON public.work_order_parts;
CREATE POLICY "Users can view parts for their company" ON public.work_order_parts FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can insert parts for their company" ON public.work_order_parts;
CREATE POLICY "Users can insert parts for their company" ON public.work_order_parts FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update parts for their company" ON public.work_order_parts;
CREATE POLICY "Users can update parts for their company" ON public.work_order_parts FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete parts for their company" ON public.work_order_parts;
CREATE POLICY "Users can delete parts for their company" ON public.work_order_parts FOR DELETE
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ WORK_ORDER_LABOR ============
DROP POLICY IF EXISTS "Users can view labor for their company" ON public.work_order_labor;
CREATE POLICY "Users can view labor for their company" ON public.work_order_labor FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can insert labor for their company" ON public.work_order_labor;
CREATE POLICY "Users can insert labor for their company" ON public.work_order_labor FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update labor for their company" ON public.work_order_labor;
CREATE POLICY "Users can update labor for their company" ON public.work_order_labor FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete labor for their company" ON public.work_order_labor;
CREATE POLICY "Users can delete labor for their company" ON public.work_order_labor FOR DELETE
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- ============ MAINTENANCE_RECORDS ============
DROP POLICY IF EXISTS "Users can view maintenance records in their company" ON public.maintenance_records;
CREATE POLICY "Users can view maintenance records in their company" ON public.maintenance_records FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can create maintenance records in their company" ON public.maintenance_records;
CREATE POLICY "Users can create maintenance records in their company" ON public.maintenance_records FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can update maintenance records in their company" ON public.maintenance_records;
CREATE POLICY "Users can update maintenance records in their company" ON public.maintenance_records FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

DROP POLICY IF EXISTS "Users can delete maintenance records in their company" ON public.maintenance_records;
CREATE POLICY "Users can delete maintenance records in their company" ON public.maintenance_records FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));
