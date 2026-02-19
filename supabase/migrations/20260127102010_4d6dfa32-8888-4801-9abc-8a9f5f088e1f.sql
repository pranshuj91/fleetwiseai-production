-- Add storage policies for company logo uploads
-- Allow authenticated users to upload logos for their company
CREATE POLICY "Company admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update logos for their company
CREATE POLICY "Company admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete logos for their company
CREATE POLICY "Company admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'signatures' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow public read access for signatures bucket (logos and signatures)
CREATE POLICY "Public can view signatures bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');