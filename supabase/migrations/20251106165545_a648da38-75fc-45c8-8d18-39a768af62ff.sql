-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Service role can manage reset tokens" ON public.password_reset_tokens;

-- No new policies needed - with RLS enabled and no policies, regular users cannot access the table
-- Edge functions using service role key will bypass RLS automatically