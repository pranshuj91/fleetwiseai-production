-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id and role to profiles
ALTER TABLE public.profiles 
ADD COLUMN company_id UUID REFERENCES public.companies(id),
ADD COLUMN role TEXT DEFAULT 'company_admin';

-- Create RLS policies for companies
CREATE POLICY "Users can view their company" 
ON public.companies 
FOR SELECT 
USING (
  id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their company" 
ON public.companies 
FOR UPDATE 
USING (
  id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Allow authenticated users to insert companies (for signup)
CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);