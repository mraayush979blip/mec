-- ====================================================================
-- MECHATRONIAN ADMIN MANAGEMENT SCRIPT
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. UPGRADE BOTH 'the.mechatronian@gmail.com' AND 'himanshubhiwapurkar@acropolis.in' TO ADMIN
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('the.mechatronian@gmail.com', 'himanshubhiwapurkar@acropolis.in');

-- ====================================================================
-- NOTE:
-- - The trigger `on_auth_user_created` has been updated in the schema definition
--   so that any new signups with EITHER 'the.mechatronian@gmail.com' OR 
--   'himanshubhiwapurkar@acropolis.in' will automatically receive the 'admin' role.
-- - If they haven't registered yet, please have them sign up via the app first,
--   and they will automatically be granted the Admin role.
-- ====================================================================
