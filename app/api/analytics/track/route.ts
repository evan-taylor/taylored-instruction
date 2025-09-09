import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analytics } from "@/db/schema";
import { createServerClientAppRouter } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerClientAppRouter();

  const { url, referrer, city, region, country } = (await req.json()) || {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    await db.insert(analytics).values({
      url,
      referrer,
      city,
      region,
      country,
      userId: user ? (user.id as string) : null,
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to record analytics" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
