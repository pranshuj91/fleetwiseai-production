-- Enable realtime for profiles and user_roles tables
-- This allows the client to subscribe to changes on these tables

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;