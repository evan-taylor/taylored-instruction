-- Update function to also return last_sign_in_at
CREATE OR REPLACE FUNCTION public.get_users_with_emails(profile_ids UUID[])
RETURNS TABLE (id UUID, email TEXT, last_sign_in_at TIMESTAMPTZ)
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  SELECT au.email INTO current_user_email
  FROM auth.users au
  WHERE au.id = auth.uid();

  IF current_user_email IN ('admin@tayloredinstruction.com', 'evan@tayloredinstruction.com') THEN
    RETURN QUERY
    SELECT p.id, u.email::text AS email, u.last_sign_in_at
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.id = ANY(profile_ids);
  ELSE
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ
    WHERE FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;
