-- Make the knowledge-files bucket public so uploaded photos and audio can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'knowledge-files';

-- Also add a policy to allow public read access to objects in the bucket
CREATE POLICY "Allow public read access to knowledge files"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-files');