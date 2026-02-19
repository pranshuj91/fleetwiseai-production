-- Work Orders table - stores extracted PDF work order data
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
    
    -- Work order identification
    work_order_number TEXT,
    source_file_name TEXT,
    source_file_path TEXT,
    
    -- Extracted vehicle info (for reference/validation)
    extracted_vin TEXT,
    extracted_unit_number TEXT,
    extracted_year INTEGER,
    extracted_make TEXT,
    extracted_model TEXT,
    extracted_odometer INTEGER,
    
    -- Customer info
    customer_name TEXT,
    customer_id_ref TEXT,
    customer_location TEXT,
    
    -- Complaint / Cause / Correction (core diagnostic data)
    complaint TEXT,
    cause TEXT,
    correction TEXT,
    fault_codes TEXT[] DEFAULT '{}',
    
    -- Work order date
    work_order_date DATE,
    
    -- Status tracking
    status TEXT DEFAULT 'extracted' CHECK (status IN ('extracted', 'reviewed', 'linked', 'completed')),
    truck_auto_created BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_orders
CREATE POLICY "Users can view work orders in their company"
ON public.work_orders FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create work orders in their company"
ON public.work_orders FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update work orders in their company"
ON public.work_orders FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete work orders in their company"
ON public.work_orders FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Master admins can manage all work orders"
ON public.work_orders FOR ALL
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Maintenance Records table - tracks service history per truck
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    
    -- Service category (safe to auto-enrich)
    service_category TEXT CHECK (service_category IN ('pm', 'brakes', 'tires', 'emissions', 'engine', 'transmission', 'electrical', 'hvac', 'suspension', 'other')),
    service_type TEXT,
    description TEXT,
    
    -- Service details
    service_date DATE,
    odometer_at_service INTEGER,
    engine_hours_at_service INTEGER,
    
    -- Parts used (only if explicitly listed - no guessing)
    parts_used JSONB DEFAULT '[]',
    
    -- Labor
    labor_hours DECIMAL(5,2),
    
    -- Source of record
    source TEXT DEFAULT 'work_order' CHECK (source IN ('work_order', 'manual', 'pm_schedule')),
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_records
CREATE POLICY "Users can view maintenance records in their company"
ON public.maintenance_records FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create maintenance records in their company"
ON public.maintenance_records FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update maintenance records in their company"
ON public.maintenance_records FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete maintenance records in their company"
ON public.maintenance_records FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Master admins can manage all maintenance records"
ON public.maintenance_records FOR ALL
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Add last_service_date to trucks table for quick lookup
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS last_service_odometer INTEGER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON public.work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_truck ON public.work_orders(truck_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vin ON public.work_orders(extracted_vin);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_company ON public.maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_truck ON public.maintenance_records(truck_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_category ON public.maintenance_records(service_category);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON public.maintenance_records(service_date);

-- Trigger for updated_at
CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();