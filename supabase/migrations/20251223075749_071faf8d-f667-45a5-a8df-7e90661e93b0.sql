-- Allow master_admin to manage all companies (create, read, update, delete)
CREATE POLICY "Master admins can manage all companies"
ON public.companies
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

-- Allow master_admin to delete companies
CREATE POLICY "Master admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role));