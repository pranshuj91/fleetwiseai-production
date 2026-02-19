-- Add photo_url column to truck_notes for supporting both photo and audio attachments
ALTER TABLE public.truck_notes 
ADD COLUMN photo_url text;