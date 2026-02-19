-- Confirm Shane's email immediately
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi

UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'shane@fleetwiseai.com';

-- Verify it worked
SELECT 
    email, 
    email_confirmed_at, 
    confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'shane@fleetwiseai.com';
