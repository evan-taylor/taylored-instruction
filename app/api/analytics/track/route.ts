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
  } catch (e: unknown) {
    const message =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as Record<string, unknown>).message === "string"
        ? ((e as Record<string, unknown>).message as string)
        : "Failed to record analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
