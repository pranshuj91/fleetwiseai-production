-- Create work order tasks table
CREATE TABLE public.work_order_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  task_type TEXT DEFAULT 'repair' CHECK (task_type IN ('repair', 'inspection', 'diagnostic', 'parts', 'other')),
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tasks in their company" 
ON public.work_order_tasks 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create tasks in their company" 
ON public.work_order_tasks 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update tasks in their company" 
ON public.work_order_tasks 
FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete tasks in their company" 
ON public.work_order_tasks 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Master admins can manage all tasks" 
ON public.work_order_tasks 
FOR ALL 
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_work_order_tasks_updated_at
BEFORE UPDATE ON public.work_order_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_work_order_tasks_work_order_id ON public.work_order_tasks(work_order_id);
CREATE INDEX idx_work_order_tasks_status ON public.work_order_tasks(status);