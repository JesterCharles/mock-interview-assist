-- Fix: is_trainer() must check app_metadata (server-only), not user_metadata (client-mutable).
-- user_metadata can be set by any authenticated user via supabase.auth.updateUser(),
-- which would let an associate escalate to trainer role.
-- app_metadata is only writable by the service role (admin API).

CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('trainer', 'admin'),
    false
  )
$$;
