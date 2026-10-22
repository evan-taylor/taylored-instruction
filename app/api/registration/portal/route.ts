import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Backend unavailable");
  }
  return new ConvexHttpClient(url);
}
/**
 * Reads the signed-in person's registrations. Identity comes from the
 * Convex Auth session cookie; the backend scopes every query to the
 * verified email on that account.
 */
export async function GET(request: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to see your registrations" },
      { status: 401, headers }
    );
  }
  const backend = client();
  backend.setAuth(token);
  const url = new URL(request.url);
  try {
    const material = url.searchParams.get("material");
    if (material) {
      const target = await backend.query(api.registrationPortal.materialUrl, {
        id: material as Id<"registrationEntitlements">,
      });
      return NextResponse.json({ url: target }, { headers });
    }
    const seatMaterials = url.searchParams.get("materials");
    if (seatMaterials) {
      const data = await backend.query(api.registrationPortal.materials, {
        seatId: seatMaterials as Id<"registrationSeats">,
        paginationOpts: {
          numItems: 50,
          cursor: url.searchParams.get("cursor"),
        },
      });
      return NextResponse.json(data, { headers });
    }
    const calendar = url.searchParams.get("calendar");
    if (calendar) {
      const content = await backend.query(api.registrationPortal.calendarFile, {
        seatId: calendar as Id<"registrationSeats">,
      });
      return new Response(content, {
        headers: {
          ...headers,
          "Content-Type": "text/calendar",
          "Content-Disposition": 'attachment; filename="class.ics"',
        },
      });
    }
    const args = {
      paginationOpts: { numItems: 20, cursor: url.searchParams.get("cursor") },
    };
    const data =
      url.searchParams.get("view") === "orders"
        ? await backend.query(api.registrationPortal.orders, args)
        : await backend.query(api.registrationPortal.registrations, args);
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json(
      { error: "Access denied or expired" },
      { status: 403, headers }
    );
  }
}
