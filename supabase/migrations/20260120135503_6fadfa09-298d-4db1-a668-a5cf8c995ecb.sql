-- Create signatures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true);

-- Storage RLS Policies for signatures bucket

-- Users can view signatures in their company (for RO PDF generation)
CREATE POLICY "Users can view company signatures"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

-- Users can upload their own signature
CREATE POLICY "Users can upload their own signature"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can update their own signature
CREATE POLICY "Users can update their own signature"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete their own signature
CREATE POLICY "Users can delete their own signature"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);