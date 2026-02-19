-- Create enum for signature roles
CREATE TYPE public.signature_role AS ENUM ('technician', 'supervisor', 'admin');

-- Create user_signatures table
CREATE TABLE public.user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role signature_role NOT NULL,
  signature_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each user can have only ONE active signature
  CONSTRAINT unique_user_signature UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_signatures_company ON public.user_signatures(company_id);
CREATE INDEX idx_user_signatures_user ON public.user_signatures(user_id);

-- Enable RLS
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own signature
CREATE POLICY "Users can view their own signature"
ON public.user_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Supervisors/Admins can view signatures in their company
CREATE POLICY "Supervisors and admins can view company signatures"
ON public.user_signatures
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'company_admin'::app_role)
    OR has_role(auth.uid(), 'shop_supervisor'::app_role)
    OR has_role(auth.uid(), 'office_manager'::app_role)
  )
);

-- Master admins can view all signatures
CREATE POLICY "Master admins can view all signatures"
ON public.user_signatures
FOR SELECT
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Users can create their own signature
CREATE POLICY "Users can create their own signature"
ON public.user_signatures
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND company_id = get_user_company_id(auth.uid())
);

-- Users can update their own signature
CREATE POLICY "Users can update their own signature"
ON public.user_signatures
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own signature
CREATE POLICY "Users can delete their own signature"
ON public.user_signatures
FOR DELETE
USING (auth.uid() = user_id);

-- Master admins can manage all signatures
CREATE POLICY "Master admins can manage all signatures"
ON public.user_signatures
FOR ALL
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_signatures_updated_at
BEFORE UPDATE ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();