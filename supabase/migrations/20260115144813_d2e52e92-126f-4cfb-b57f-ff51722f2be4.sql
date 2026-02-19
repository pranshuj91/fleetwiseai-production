-- Create work_order_parts table to store parts used in work orders
CREATE TABLE public.work_order_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  part_number TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  extended_price DECIMAL(10,2),
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_order_labor table to store labor entries
CREATE TABLE public.work_order_labor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  technician_id TEXT,
  technician_name TEXT,
  hours DECIMAL(5,2),
  rate DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  line_item_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_labor ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for work_order_parts
CREATE POLICY "Users can view parts for their company" 
ON public.work_order_parts 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert parts for their company" 
ON public.work_order_parts 
FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update parts for their company" 
ON public.work_order_parts 
FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete parts for their company" 
ON public.work_order_parts 
FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for work_order_labor
CREATE POLICY "Users can view labor for their company" 
ON public.work_order_labor 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert labor for their company" 
ON public.work_order_labor 
FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update labor for their company" 
ON public.work_order_labor 
FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete labor for their company" 
ON public.work_order_labor 
FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_work_order_parts_updated_at
BEFORE UPDATE ON public.work_order_parts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_order_labor_updated_at
BEFORE UPDATE ON public.work_order_labor
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_work_order_parts_work_order_id ON public.work_order_parts(work_order_id);
CREATE INDEX idx_work_order_parts_company_id ON public.work_order_parts(company_id);
CREATE INDEX idx_work_order_labor_work_order_id ON public.work_order_labor(work_order_id);
CREATE INDEX idx_work_order_labor_company_id ON public.work_order_labor(company_id);