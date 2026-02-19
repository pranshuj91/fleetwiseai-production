-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL CHECK (type IN ('work_order', 'estimate', 'pm', 'alert', 'invoice', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see notifications for their company
CREATE POLICY "Users can view their company notifications"
  ON public.notifications
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) OR user_id = auth.uid());

-- Admins can create notifications for their company
CREATE POLICY "Admins can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) 
    OR has_role(auth.uid(), 'master_admin'::app_role)
    OR has_role(auth.uid(), 'company_admin'::app_role)
  );