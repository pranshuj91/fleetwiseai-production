-- Add tags column to knowledge_documents for classification
ALTER TABLE public.knowledge_documents 
ADD COLUMN tags text[] DEFAULT '{}';

-- Create index for efficient tag-based queries
CREATE INDEX idx_knowledge_documents_tags ON public.knowledge_documents USING GIN(tags);

-- Add tags to document_chunks for search filtering
ALTER TABLE public.document_chunks 
ADD COLUMN tags text[] DEFAULT '{}';