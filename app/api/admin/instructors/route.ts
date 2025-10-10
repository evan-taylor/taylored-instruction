export const runtime = "nodejs";

import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, usersInAuth } from "@/db/schema";
import { createServerClientAppRouter } from "@/utils/supabase/server";

function isAdminEmail(email?: string | null): boolean {
  const adminEmails = [
    "admin@tayloredinstruction.com",
    "evan@tayloredinstruction.com",
  ];
  return !!email && adminEmails.includes(email);
}

async function requireAdmin() {
  const supabase = createServerClientAppRouter();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const meta = (user as { user_metadata?: unknown }).user_metadata;
  const metaEmail =
    meta &&
    typeof meta === "object" &&
    "email" in meta &&
    typeof (meta as Record<string, unknown>).email === "string"
      ? ((meta as Record<string, unknown>).email as string)
      : null;
  const email = user.email ?? metaEmail ?? null;
  if (!isAdminEmail(email)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, user };
}

export async function GET() {
  const res = await requireAdmin();
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  const profileRows = await db
    .select({
      id: profiles.id,
      is_instructor: profiles.isInstructor,
      updated_at: profiles.updatedAt,
      last_login: profiles.lastLogin,
      user_email: usersInAuth.email,
    })
    .from(profiles)
    .leftJoin(usersInAuth, eq(profiles.id, usersInAuth.id))
    .orderBy(desc(profiles.updatedAt));

  const IdPrefixLen = 6;
  const IdSuffixLen = 4;
  const payload = profileRows.map((r) => ({
    id: r.id,
    is_instructor: r.is_instructor,
    updated_at: r.updated_at,
    last_login: r.last_login,
    user_email: r.user_email || null,
    short_id: r.id
      ? `${r.id.slice(0, IdPrefixLen)}...${r.id.slice(-IdSuffixLen)}`
      : undefined,
  }));

  return NextResponse.json(payload);
}

export async function PATCH(req: NextRequest) {
  const res = await requireAdmin();
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  const { profileId, newStatus } = (await req.json()) || {};
  if (!profileId || typeof newStatus !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await db
    .update(profiles)
    .set({ isInstructor: newStatus, updatedAt: now })
    .where(eq(profiles.id, profileId));

  return NextResponse.json({ ok: true, updated_at: now });
}
