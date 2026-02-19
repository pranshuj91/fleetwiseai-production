-- Create knowledge_articles table for the Tribal Knowledge Base
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'diagnostic_tip',
  difficulty TEXT DEFAULT 'intermediate',
  fault_codes TEXT[] DEFAULT '{}',
  symptoms TEXT NOT NULL,
  solution TEXT NOT NULL,
  parts_needed TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users within the same company to view articles
CREATE POLICY "Users can view knowledge articles in their company"
ON public.knowledge_articles
FOR SELECT
TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow all authenticated users to insert articles (technicians, supervisors, admins)
CREATE POLICY "Authenticated users can create knowledge articles"
ON public.knowledge_articles
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND author_id = auth.uid()
);

-- Allow users to update their own articles
CREATE POLICY "Users can update their own articles"
ON public.knowledge_articles
FOR UPDATE
TO authenticated
USING (author_id = auth.uid());

-- Allow admins to delete articles
CREATE POLICY "Admins can delete articles"
ON public.knowledge_articles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'master_admin'::app_role) 
  OR public.has_role(auth.uid(), 'company_admin'::app_role)
);

-- Create updated_at trigger
CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_knowledge_articles_company_id ON public.knowledge_articles(company_id);
CREATE INDEX idx_knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX idx_knowledge_articles_author_id ON public.knowledge_articles(author_id);