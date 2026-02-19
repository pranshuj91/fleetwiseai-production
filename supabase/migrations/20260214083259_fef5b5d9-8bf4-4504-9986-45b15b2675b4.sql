
-- Create standalone diagnostic sessions table
CREATE TABLE public.standalone_diagnostic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_by UUID NOT NULL,
  vin TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  unit_number TEXT,
  odometer INTEGER,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.standalone_diagnostic_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sessions in their company"
ON public.standalone_diagnostic_sessions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create sessions in their company"
ON public.standalone_diagnostic_sessions FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update sessions in their company"
ON public.standalone_diagnostic_sessions FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

-- Index for VIN search
CREATE INDEX idx_standalone_diag_vin ON public.standalone_diagnostic_sessions(vin);
CREATE INDEX idx_standalone_diag_company ON public.standalone_diagnostic_sessions(company_id);
CREATE INDEX idx_standalone_diag_created_by ON public.standalone_diagnostic_sessions(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_standalone_diagnostic_sessions_updated_at
BEFORE UPDATE ON public.standalone_diagnostic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
