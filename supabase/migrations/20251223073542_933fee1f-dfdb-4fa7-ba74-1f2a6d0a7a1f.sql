-- Insert master_admin role for test@gmail.com user
INSERT INTO public.user_roles (user_id, role, company_id)
VALUES (
  'beebf770-93e1-43b0-bbcb-4b7685fba140', 
  'master_admin', 
  'ea745f36-9ad7-4a36-a80b-4c130910b0e6'
)
ON CONFLICT DO NOTHING;

-- Insert company_admin role for subaplha@gmail.com user
INSERT INTO public.user_roles (user_id, role, company_id)
VALUES (
  '2c855971-6b43-4376-85a2-9f8d1b09baa4', 
  'company_admin', 
  'e1546797-208a-4fe6-9dcc-47d3ff557e57'
)
ON CONFLICT DO NOTHING;