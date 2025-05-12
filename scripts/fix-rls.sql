-- First, drop all existing product-related policies to start fresh
DROP POLICY IF EXISTS "Public can view non-instructor products" ON products;
DROP POLICY IF EXISTS "Instructors can view instructor products" ON products;
DROP POLICY IF EXISTS "Instructors can view instructor products (Debug)" ON products;
DROP POLICY IF EXISTS "Allow instructors read access to all products" ON products;
DROP POLICY IF EXISTS "Allow non-instructors read access to non-restricted products" ON products;
DROP POLICY IF EXISTS "Allow public read access to non-restricted products" ON products;

-- Make sure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create a simpler, more direct policy for public users (non-instructors)
CREATE POLICY "public_can_see_non_instructor_products" 
ON products FOR SELECT 
USING (requires_instructor = false);

-- Create a policy for authenticated instructors
CREATE POLICY "instructors_can_see_all_products" 
ON products FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_instructor = true
    )
);

-- Let's test the policies with a specific user
-- Note: Replace the USER_ID with your actual instructor user ID when running this
/*
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "USER_ID", "role": "authenticated"}';

-- This should return all products if the user is an instructor,
-- or only non-instructor products if the user is not an instructor
SELECT id, name, type, requires_instructor FROM products;
*/ 