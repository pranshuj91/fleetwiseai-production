-- Add due_date column to work_order_tasks table
ALTER TABLE public.work_order_tasks 
ADD COLUMN due_date DATE;