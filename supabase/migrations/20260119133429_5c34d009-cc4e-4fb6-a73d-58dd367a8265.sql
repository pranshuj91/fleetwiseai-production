-- Create enum types for truck_notes
CREATE TYPE note_type AS ENUM ('text', 'voice', 'photo');
CREATE TYPE note_source AS ENUM ('manual', 'scan', 'ai');

-- Create truck_notes table
CREATE TABLE public.truck_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  note_type note_type NOT NULL DEFAULT 'text',
  note_text TEXT,
  media_url TEXT,
  reminder_at TIMESTAMP WITH TIME ZONE,
  source note_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_truck_notes_truck_id ON public.truck_notes(truck_id);
CREATE INDEX idx_truck_notes_company_id ON public.truck_notes(company_id);
CREATE INDEX idx_truck_notes_created_by ON public.truck_notes(created_by);
CREATE INDEX idx_truck_notes_reminder_at ON public.truck_notes(reminder_at) WHERE reminder_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.truck_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- All users in company can view notes
CREATE POLICY "Users can view notes in their company"
ON public.truck_notes
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Technicians and above can create notes
CREATE POLICY "Users can create notes in their company"
ON public.truck_notes
FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Supervisors and admins can update notes
CREATE POLICY "Supervisors and admins can update notes"
ON public.truck_notes
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'master_admin'::app_role) OR
    has_role(auth.uid(), 'company_admin'::app_role) OR
    has_role(auth.uid(), 'shop_supervisor'::app_role)
  )
);

-- Supervisors and admins can delete notes
CREATE POLICY "Supervisors and admins can delete notes"
ON public.truck_notes
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'master_admin'::app_role) OR
    has_role(auth.uid(), 'company_admin'::app_role) OR
    has_role(auth.uid(), 'shop_supervisor'::app_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_truck_notes_updated_at
BEFORE UPDATE ON public.truck_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();