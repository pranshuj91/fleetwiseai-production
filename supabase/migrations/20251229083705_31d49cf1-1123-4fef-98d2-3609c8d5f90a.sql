-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for document types
CREATE TYPE public.document_type AS ENUM ('manual', 'oem', 'transcription', 'text', 'other');

-- Create enum for processing status
CREATE TYPE public.processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create knowledge_documents table to store uploaded documents
CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content TEXT, -- Full text content of the document
  processing_status processing_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table to store text chunks with embeddings
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 produces 1536 dimensions
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_documents
-- Master admins can manage all documents
CREATE POLICY "Master admins can manage all documents"
ON public.knowledge_documents
FOR ALL
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Company admins can manage documents in their company
CREATE POLICY "Company admins can manage company documents"
ON public.knowledge_documents
FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

-- All authenticated users can view documents in their company
CREATE POLICY "Users can view company documents"
ON public.knowledge_documents
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for document_chunks
-- Master admins can manage all chunks
CREATE POLICY "Master admins can manage all chunks"
ON public.document_chunks
FOR ALL
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Company admins can manage chunks in their company
CREATE POLICY "Company admins can manage company chunks"
ON public.document_chunks
FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

-- All authenticated users can view chunks in their company
CREATE POLICY "Users can view company chunks"
ON public.document_chunks
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_knowledge_documents_company ON public.knowledge_documents(company_id);
CREATE INDEX idx_knowledge_documents_status ON public.knowledge_documents(processing_status);
CREATE INDEX idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX idx_document_chunks_company ON public.document_chunks(company_id);

-- Create HNSW index for vector similarity search (faster than IVFFlat for smaller datasets)
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Create function to search similar documents
CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.7,
  filter_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 
    (filter_company_id IS NULL OR dc.company_id = filter_company_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_documents_updated_at
BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();