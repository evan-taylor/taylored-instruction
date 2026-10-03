import { createHash, randomBytes } from "node:crypto";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
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
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid origin" },
      { status: 403, headers }
    );
  }
  try {
    const body = await request.json();
    if (body.email) {
      await client().action(api.registrationExternal.requestPortal, {
        email: String(body.email),
      });
      return NextResponse.json(
        { message: "Check your email for access instructions." },
        { headers }
      );
    }
    if (typeof body.token !== "string") {
      throw new Error("Invalid access link");
    }
    const grant = randomBytes(32).toString("hex");
    const ok = await client().mutation(api.registrationPortal.exchange, {
      token: body.token,
      grantHash: createHash("sha256").update(grant).digest("hex"),
    });
    if (!ok) {
      throw new Error("Access link expired or already used");
    }
    (await cookies()).set("registration_access", grant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/registration",
      maxAge: 86_400,
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to complete access. Request another link or try again later.",
      },
      { status: 400, headers }
    );
  }
}
export async function GET(request: Request) {
  const grant = (await cookies()).get("registration_access")?.value;
  const token = await convexAuthNextjsToken();
  if (!(grant || token)) {
    return NextResponse.json(
      { error: "Request secure email access" },
      { status: 401, headers }
    );
  }
  const backend = client();
  if (token) {
    backend.setAuth(token);
  }
  const url = new URL(request.url);
  try {
    const material = url.searchParams.get("material");
    if (material) {
      const target = await backend.query(api.registrationPortal.materialUrl, {
        grant,
        id: material as Id<"registrationEntitlements">,
      });
      return NextResponse.json({ url: target }, { headers });
    }
    const calendar = url.searchParams.get("calendar");
    if (calendar) {
      const content = await backend.query(api.registrationPortal.calendarFile, {
        grant,
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
      grant,
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
