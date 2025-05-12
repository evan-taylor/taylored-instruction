-- Create a function to get user emails by profile IDs
-- This function allows authorized admin users to get user emails
-- from the auth.users table based on profile IDs
CREATE OR REPLACE FUNCTION public.get_users_with_emails(profile_ids UUID[])
RETURNS TABLE (id UUID, email TEXT) 
SECURITY DEFINER 
-- Set search path explicitly to avoid any injection vulnerabilities
SET search_path = public, auth
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  -- Get the current user's email with fully qualified names
  SELECT au.email INTO current_user_email 
  FROM auth.users au 
  WHERE au.id = auth.uid();
  
  -- Check if the user is an admin
  IF current_user_email IN ('admin@tayloredinstruction.com', 'evan@tayloredinstruction.com') THEN
    
    -- Return users matching the profile IDs
    -- Using aliases consistently to avoid ambiguity
    RETURN QUERY
    SELECT p.id, u.email::text AS email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.id = ANY(profile_ids);
  ELSE
    -- Return empty set for non-admin users
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT
    WHERE FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql; 