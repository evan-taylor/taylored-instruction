import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { message: "Authentication diagnostics are unavailable." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
