-- Create enum for signature types
CREATE TYPE public.signature_type AS ENUM ('technician', 'authorized_rep', 'customer');

-- Create business_profiles table (one per company)
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_signatures table
CREATE TABLE public.business_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  signature_type public.signature_type NOT NULL,
  signer_name TEXT NOT NULL,
  signature_image_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_profiles
CREATE POLICY "Users can view their company profile"
  ON public.business_profiles FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create their company profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update their company profile"
  ON public.business_profiles FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete their company profile"
  ON public.business_profiles FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- RLS policies for business_signatures
CREATE POLICY "Users can view their company signatures"
  ON public.business_signatures FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create signatures for their company"
  ON public.business_signatures FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update their company signatures"
  ON public.business_signatures FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete their company signatures"
  ON public.business_signatures FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Add updated_at trigger for business_profiles
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_business_profiles_company_id ON public.business_profiles(company_id);
CREATE INDEX idx_business_signatures_company_id ON public.business_signatures(company_id);
CREATE INDEX idx_business_signatures_work_order_id ON public.business_signatures(work_order_id);