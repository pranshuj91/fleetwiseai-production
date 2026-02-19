-- Add RAG-readiness fields to truck_notes
ALTER TABLE public.truck_notes
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_embedded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Create index on is_embedded for efficient RAG processing queries
CREATE INDEX IF NOT EXISTS idx_truck_notes_is_embedded 
ON public.truck_notes(is_embedded) 
WHERE is_embedded = FALSE;

-- Create index on tags for filtering
CREATE INDEX IF NOT EXISTS idx_truck_notes_tags 
ON public.truck_notes USING GIN(tags);

-- Add comment documenting RAG purpose
COMMENT ON COLUMN public.truck_notes.tags IS 'Categorization tags for RAG filtering (e.g., engine, brakes, electrical)';
COMMENT ON COLUMN public.truck_notes.is_embedded IS 'Flag indicating if note has been vectorized for RAG';
COMMENT ON COLUMN public.truck_notes.embedded_at IS 'Timestamp when note was embedded';
COMMENT ON COLUMN public.truck_notes.token_count IS 'Token count for chunking/embedding budget';