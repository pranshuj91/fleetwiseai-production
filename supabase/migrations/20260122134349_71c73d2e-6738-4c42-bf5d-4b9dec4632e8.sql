-- Add complaint, cause, correction, reason, activity, billable columns to work_order_tasks
-- These columns store the extracted 3 C's and service codes for each task

ALTER TABLE public.work_order_tasks 
ADD COLUMN IF NOT EXISTS complaint TEXT,
ADD COLUMN IF NOT EXISTS cause TEXT,
ADD COLUMN IF NOT EXISTS correction TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS activity TEXT,
ADD COLUMN IF NOT EXISTS billable TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.work_order_tasks.complaint IS 'The specific complaint text for this task (e.g., Trailer PM Service)';
COMMENT ON COLUMN public.work_order_tasks.cause IS 'The cause/root cause for this task (e.g., due for PM)';
COMMENT ON COLUMN public.work_order_tasks.correction IS 'The correction/resolution applied for this task';
COMMENT ON COLUMN public.work_order_tasks.reason IS 'Service reason code (e.g., (08) PREVENTIVE)';
COMMENT ON COLUMN public.work_order_tasks.activity IS 'Activity code (e.g., (PM 005-50))';
COMMENT ON COLUMN public.work_order_tasks.billable IS 'Billable status: B=Billable, N=Non-billable, W=Warranty';