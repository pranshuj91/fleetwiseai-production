-- Add column to store completed diagnostic procedure steps
ALTER TABLE public.diagnostic_chat_sessions 
ADD COLUMN IF NOT EXISTS completed_steps integer[] DEFAULT '{}'::integer[];

-- Add column to store the extracted procedure steps
ALTER TABLE public.diagnostic_chat_sessions 
ADD COLUMN IF NOT EXISTS procedure_steps text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.diagnostic_chat_sessions.completed_steps IS 'Array of step indices that have been marked as completed';
COMMENT ON COLUMN public.diagnostic_chat_sessions.procedure_steps IS 'Array of extracted diagnostic procedure steps from AI response';