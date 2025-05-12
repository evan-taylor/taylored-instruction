-- Allow users to insert their own profile rows when they sign up
-- This policy enables the create_profile_for_user trigger to insert successfully
-- Ensure RLS is enabled on profiles (already enabled)

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id); 