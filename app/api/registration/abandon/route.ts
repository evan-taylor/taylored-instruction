import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Releases a held checkout. Sent with `navigator.sendBeacon` when the
 * purchaser leaves the payment step, so the body arrives as text, not JSON.
 */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  try {
    const body = JSON.parse(await request.text()) as {
      orderId?: string;
      requestKey?: string;
    };
    if (
      typeof body.orderId !== "string" ||
      typeof body.requestKey !== "string"
    ) {
      throw new Error("Invalid request");
    }
    await new ConvexHttpClient(url).mutation(api.registration.abandon, {
      orderId: body.orderId as Id<"registrationOrders">,
      requestKey: body.requestKey,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
