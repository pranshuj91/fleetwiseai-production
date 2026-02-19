-- Add external_id column to customers table for enterprise fleet exports
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create index for efficient lookup by external_id within company
CREATE INDEX IF NOT EXISTS idx_customers_external_id_company 
ON public.customers(company_id, external_id) 
WHERE external_id IS NOT NULL;

-- Create unique constraint on VIN per company to enable upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_trucks_vin_company_unique 
ON public.trucks(company_id, vin);

-- Add in_service_date column to trucks for fleet export data
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS in_service_date DATE;