-- Create storage bucket for original PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for knowledge-files bucket
-- Master admins can manage all files
CREATE POLICY "Master admins can manage all files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'knowledge-files' 
  AND has_role(auth.uid(), 'master_admin'::app_role)
)
WITH CHECK (
  bucket_id = 'knowledge-files' 
  AND has_role(auth.uid(), 'master_admin'::app_role)
);

-- Company admins can manage their company's files
CREATE POLICY "Company admins can manage company files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'knowledge-files' 
  AND has_role(auth.uid(), 'company_admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'knowledge-files' 
  AND has_role(auth.uid(), 'company_admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

-- Users can view their company's files
CREATE POLICY "Users can view company files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'knowledge-files' 
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

-- Add file_path column to knowledge_documents to store the storage path
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS file_path TEXT;