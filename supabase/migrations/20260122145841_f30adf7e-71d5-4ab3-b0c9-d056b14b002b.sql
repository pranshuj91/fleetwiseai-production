-- Create storage bucket for task/work order photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for task photos bucket
CREATE POLICY "Users can upload task photos for their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-photos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view task photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-photos');

CREATE POLICY "Users can delete their task photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-photos' AND
  auth.uid() IS NOT NULL
);

-- Create table to track task photos
CREATE TABLE public.task_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.work_order_tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_photos
CREATE POLICY "Users can view task photos in their company"
ON public.task_photos FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create task photos in their company"
ON public.task_photos FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete task photos in their company"
ON public.task_photos FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));