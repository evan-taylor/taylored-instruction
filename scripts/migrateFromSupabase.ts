import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";
import { api } from "../convex/_generated/api";

config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!(SUPABASE_URL && SUPABASE_SERVICE_KEY)) {
  console.error("Missing Supabase credentials. Please set:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_KEY");
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error(
    "Missing CONVEX_URL. Please set NEXT_PUBLIC_CONVEX_URL in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const convex = new ConvexHttpClient(CONVEX_URL);

type SupabaseProfile = {
  id: string;
  is_instructor: boolean;
  updated_at: string | null;
  last_login: string | null;
};

type SupabaseProduct = {
  id: string;
  original_csv_id: number | null;
  sku: string | null;
  name: string;
  description: string | null;
  image_urls: string | null;
  categories: string[] | null;
  type: string;
  requires_instructor: boolean;
  stripe_price_id: string | null;
};

async function migrateProfiles() {
  console.log("\n=== Migrating Profiles ===");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*");

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return { success: false, count: 0 };
  }

  console.log(`Found ${profiles?.length || 0} profiles in Supabase`);

  if (!profiles || profiles.length === 0) {
    console.log("No profiles to migrate");
    return { success: true, count: 0 };
  }

  const { data: users, error: usersError } =
    await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return { success: false, count: 0 };
  }

  console.log(`Found ${users?.users?.length || 0} users in Supabase Auth`);

  const userEmailMap = new Map<string, string>();
  for (const user of users.users) {
    if (user.email) {
      userEmailMap.set(user.id, user.email);
    }
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of profiles as SupabaseProfile[]) {
    const email = userEmailMap.get(profile.id);

    if (!email) {
      console.warn(`No email found for profile ${profile.id}, skipping`);
      skipped++;
      continue;
    }

    try {
      const result = await convex.mutation(api.migration.importStagingProfile, {
        email,
        supabaseUserId: profile.id,
        isInstructor: profile.is_instructor,
        updatedAt: profile.updated_at || undefined,
        lastLogin: profile.last_login || undefined,
      });

      if (result.imported) {
        imported++;
        console.log(`✓ Imported profile for ${email}`);
      } else {
        skipped++;
        console.log(`- Skipped profile for ${email}: ${result.reason}`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ Error importing profile for ${email}:`, error);
    }
  }

  console.log("\nProfiles migration complete:");
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  return { success: errors === 0, count: imported };
}

async function migrateProducts() {
  console.log("\n=== Migrating Products ===");

  const { data: products, error } = await supabase.from("products").select("*");

  if (error) {
    console.error("Error fetching products:", error);
    return { success: false, count: 0 };
  }

  console.log(`Found ${products?.length || 0} products in Supabase`);

  if (!products || products.length === 0) {
    console.log("No products to migrate");
    return { success: true, count: 0 };
  }

  const BATCH_SIZE = 50;
  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE) as SupabaseProduct[];
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const convexProducts = batch.map((p) => ({
      originalCsvId: p.original_csv_id || undefined,
      sku: p.sku || undefined,
      name: p.name,
      description: p.description || undefined,
      imageUrls: p.image_urls || undefined,
      categories: p.categories || undefined,
      type: p.type,
      requiresInstructor: p.requires_instructor,
      stripePriceId: p.stripe_price_id || undefined,
    }));

    try {
      const results = await convex.mutation(api.migration.importProducts, {
        products: convexProducts,
      });

      const imported = results.filter(
        (r: { imported: boolean }) => r.imported
      ).length;
      const skipped = results.filter(
        (r: { imported: boolean }) => !r.imported
      ).length;

      totalImported += imported;
      totalSkipped += skipped;

      console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
    } catch (batchError) {
      console.error("Error importing batch:", batchError);
    }
  }

  console.log("\nProducts migration complete:");
  console.log(`  Imported: ${totalImported}`);
  console.log(`  Skipped: ${totalSkipped}`);

  return { success: true, count: totalImported };
}

async function main() {
  console.log("=== Supabase to Convex Migration ===");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log("");

  const profilesResult = await migrateProfiles();
  const productsResult = await migrateProducts();

  console.log("\n=== Migration Summary ===");
  console.log(`Profiles: ${profilesResult.count} migrated`);
  console.log(`Products: ${productsResult.count} migrated`);

  if (profilesResult.success && productsResult.success) {
    console.log("\n✓ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Deploy your app with the updated Convex schema");
    console.log("2. Users will need to log in once with Google or magic link");
    console.log("3. Their data will be automatically attached on first login");
    console.log("4. Check migration stats with the getMigrationStats query");
  } else {
    console.log(
      "\n✗ Migration completed with errors. Please review the logs above."
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
