
-- Create invite_tokens table for tracking invite links
CREATE TABLE public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  role text NOT NULL,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at timestamptz,
  password_set_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Master admins can view all invite tokens
CREATE POLICY "Master admins can view all invite tokens"
ON public.invite_tokens FOR SELECT
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Company admins and office managers can view their company's invite tokens
CREATE POLICY "Company scoped users can view invite tokens"
ON public.invite_tokens FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'company_admin'::app_role) 
    OR has_role(auth.uid(), 'office_manager'::app_role)
  )
);

-- Index for fast token lookups
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX idx_invite_tokens_user_id ON public.invite_tokens(user_id);
