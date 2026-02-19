-- Create trucks table for persistent truck storage
CREATE TABLE public.trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  customer_id UUID REFERENCES public.customers(id),
  vin TEXT NOT NULL,
  unit_id TEXT,
  truck_number TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  vehicle_class TEXT,
  body_type TEXT,
  odometer_miles INTEGER,
  engine_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT trucks_vin_company_unique UNIQUE (vin, company_id)
);

-- Enable Row Level Security
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view trucks in their company"
  ON public.trucks
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create trucks in their company"
  ON public.trucks
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update trucks in their company"
  ON public.trucks
  FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete trucks in their company"
  ON public.trucks
  FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Master admins can manage all trucks"
  ON public.trucks
  FOR ALL
  USING (has_role(auth.uid(), 'master_admin'))
  WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_trucks_company_id ON public.trucks(company_id);
CREATE INDEX idx_trucks_customer_id ON public.trucks(customer_id);
CREATE INDEX idx_trucks_vin ON public.trucks(vin);