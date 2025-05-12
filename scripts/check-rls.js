const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing required environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY");
    process.exit(1);
}

async function main() {
    console.log("RLS Diagnostic Tool");
    console.log("=================");

    // Create a Supabase admin client using the service key
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. List all RLS policies
    console.log("\n1. Listing all RLS policies for 'products' table:");
    const { data: policies, error: policiesError } = await adminSupabase.rpc(
        'pg_get_policies',
        { table_name: 'products' }
    );

    if (policiesError) {
        console.error("Error fetching policies:", policiesError);
    } else {
        console.log(JSON.stringify(policies, null, 2));
    }

    // 2. Check if there are any products in the database
    console.log("\n2. Checking for eCard products in the database:");
    const { data: products, error: productsError } = await adminSupabase
        .from('products')
        .select('id, name, type, requires_instructor')
        .eq('type', 'ecard');

    if (productsError) {
        console.error("Error fetching products:", productsError);
    } else {
        console.log(`Found ${products.length} eCard products:`);
        console.log(JSON.stringify(products, null, 2));
    }

    // 3. Check profiles with instructor status
    console.log("\n3. Checking profiles with instructor status:");
    const { data: instructors, error: instructorsError } = await adminSupabase
        .from('profiles')
        .select('id, is_instructor')
        .eq('is_instructor', true);

    if (instructorsError) {
        console.error("Error fetching instructors:", instructorsError);
    } else {
        console.log(`Found ${instructors.length} instructors:`);
        console.log(JSON.stringify(instructors, null, 2));
    }

    // 4. Testing the RLS policy with a specific user
    // This would require more setup with auth in a real scenario
    console.log("\n4. To test with a specific user ID, try this SQL in the Supabase SQL editor:");
    console.log(`
-- Replace USER_ID with a valid instructor user ID
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "USER_ID", "role": "authenticated"}';

-- Then run your query
SELECT * FROM products WHERE type = 'ecard';
  `);
}

main().catch(console.error); 