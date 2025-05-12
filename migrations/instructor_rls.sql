-- Enable Row Level Security for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view non-instructor-restricted products
CREATE POLICY "Public can view non-instructor products" ON products
FOR SELECT
USING (requires_instructor = false);

-- Create policy to allow instructors to view instructor-restricted products
CREATE POLICY "Instructors can view instructor products" ON products
FOR SELECT
USING (
  requires_instructor = true AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_instructor = true
  )
);

-- Create policy to allow everyone to select from profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create a trigger to create profiles for new users
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, is_instructor, updated_at)
  VALUES (NEW.id, false, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on auth.users to create a profile when a user is created
CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user(); 