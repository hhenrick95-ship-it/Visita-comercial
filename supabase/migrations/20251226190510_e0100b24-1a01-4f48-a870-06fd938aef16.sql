-- Create function to check must_reset_password bypassing RLS
CREATE OR REPLACE FUNCTION public.check_must_reset_password(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT must_reset_password FROM profiles WHERE email = lower(trim(user_email)) LIMIT 1),
    false
  );
$$;