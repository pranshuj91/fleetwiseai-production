-- Create table for diagnostic chat sessions
CREATE TABLE public.diagnostic_chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  work_order_id uuid REFERENCES public.work_orders(id),
  truck_id uuid REFERENCES public.trucks(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  fault_codes text[] DEFAULT '{}'::text[],
  complaint text,
  status text DEFAULT 'active'::text,
  summary text
);

-- Create table for individual chat messages
CREATE TABLE public.diagnostic_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.diagnostic_chat_sessions(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb DEFAULT '[]'::jsonb,
  feedback_rating text,
  feedback_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_diagnostic_chat_sessions_work_order ON public.diagnostic_chat_sessions(work_order_id);
CREATE INDEX idx_diagnostic_chat_sessions_company ON public.diagnostic_chat_sessions(company_id);
CREATE INDEX idx_diagnostic_chat_messages_session ON public.diagnostic_chat_messages(session_id);

-- Enable RLS
ALTER TABLE public.diagnostic_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostic_chat_sessions
CREATE POLICY "Users can view chat sessions in their company"
  ON public.diagnostic_chat_sessions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create chat sessions in their company"
  ON public.diagnostic_chat_sessions FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update chat sessions in their company"
  ON public.diagnostic_chat_sessions FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete chat sessions in their company"
  ON public.diagnostic_chat_sessions FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for diagnostic_chat_messages
CREATE POLICY "Users can view chat messages in their company"
  ON public.diagnostic_chat_messages FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create chat messages in their company"
  ON public.diagnostic_chat_messages FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update chat messages in their company"
  ON public.diagnostic_chat_messages FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

-- Trigger to update session timestamp when messages are added
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.diagnostic_chat_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_session_on_message
  AFTER INSERT ON public.diagnostic_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_session_timestamp();