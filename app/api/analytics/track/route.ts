import { type NextRequest, NextResponse } from "next/server";
import { createServerClientAppRouter } from "@/utils/supabase/server";
import { db } from "@/db";
import { analytics } from "@/db/schema";

export async function POST(req: NextRequest) {
  const supabase = createServerClientAppRouter();

  const {
    url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    city,
    region,
    country,
  } = (await req.json()) || {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    await db.insert(analytics).values({
      url,
      referrer,
      utmSource: utm_source,
      utmMedium: utm_medium,
      utmCampaign: utm_campaign,
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
