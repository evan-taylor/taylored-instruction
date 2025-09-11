export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createServerClientAppRouter } from "@/utils/supabase/server";

export async function GET() {
  // Prefer forwarded header from middleware to avoid extra Supabase call
  const h = headers();
  let userId = h.get("x-user-id") ?? undefined;

  if (!userId) {
    // Fallback to Supabase if header wasn't set
    const supabase = createServerClientAppRouter();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
  }

  const existing = await db
    .select({
      id: profiles.id,
      is_instructor: profiles.isInstructor,
      updated_at: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));

  if (existing.length > 0) {
    return NextResponse.json(existing[0]);
  }

  const now = new Date().toISOString();
  await db
    .insert(profiles)
    .values({ id: userId, isInstructor: false, updatedAt: now });

  return NextResponse.json({
    id: userId,
    is_instructor: false,
    updated_at: now,
  });
}
