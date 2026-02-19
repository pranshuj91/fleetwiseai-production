
-- Create truck_chat_sessions table
CREATE TABLE public.truck_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_by UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create truck_chat_messages table
CREATE TABLE public.truck_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.truck_chat_sessions(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.truck_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for truck_chat_sessions
CREATE POLICY "Users can view sessions in their company"
ON public.truck_chat_sessions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Users can create sessions in their company"
ON public.truck_chat_sessions FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Users can update sessions in their company"
ON public.truck_chat_sessions FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Users can delete sessions in their company"
ON public.truck_chat_sessions FOR DELETE
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- RLS policies for truck_chat_messages
CREATE POLICY "Users can view messages in their company"
ON public.truck_chat_messages FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Users can create messages in their company"
ON public.truck_chat_messages FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role));

-- Indexes
CREATE INDEX idx_truck_chat_sessions_truck ON public.truck_chat_sessions(truck_id);
CREATE INDEX idx_truck_chat_sessions_company ON public.truck_chat_sessions(company_id);
CREATE INDEX idx_truck_chat_messages_session ON public.truck_chat_messages(session_id);
CREATE INDEX idx_truck_chat_messages_truck ON public.truck_chat_messages(truck_id);

-- Trigger for updated_at
CREATE TRIGGER update_truck_chat_sessions_updated_at
BEFORE UPDATE ON public.truck_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
