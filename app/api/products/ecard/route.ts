import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, profiles } from "@/db/schema";
import { createServerClientAppRouter } from "@/utils/supabase/server";

export async function GET() {
  // Prefer user from middleware header to avoid extra Supabase network hop
  const h = headers();
  let userId = h.get("x-user-id") ?? undefined;

  if (!userId) {
    const supabase = createServerClientAppRouter();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  // Enforce instructor access since Drizzle bypasses Supabase RLS
  const prof = await db
    .select({ isInstructor: profiles.isInstructor })
    .from(profiles)
    .where(eq(profiles.id, userId));

  const isInstructor = prof[0]?.isInstructor ?? false;
  if (!isInstructor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      stripePriceId: products.stripePriceId,
      imageUrls: products.imageUrls,
      type: products.type,
      requiresInstructor: products.requiresInstructor,
    })
    .from(products)
    .where(eq(products.type, "ecard"));

  // Map to snake_case keys to match current client expectations
  const payload = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    stripe_price_id: r.stripePriceId,
    image_urls: r.imageUrls,
    type: r.type,
    requires_instructor: r.requiresInstructor,
  }));

  return NextResponse.json(payload);
}
