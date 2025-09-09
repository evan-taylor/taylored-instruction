import { NextRequest, NextResponse } from "next/server";
import { createServerClientAppRouter } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles, usersInAuth } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const email = user.email || (user.user_metadata as any)?.email || null;
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

  const rows = await db
    .select({
      id: profiles.id,
      is_instructor: profiles.isInstructor,
      updated_at: profiles.updatedAt,
      user_email: usersInAuth.email,
    })
    .from(profiles)
    .leftJoin(usersInAuth, eq(profiles.id, usersInAuth.id))
    .orderBy(desc(profiles.updatedAt));

  const payload = rows.map((r) => ({
    ...r,
    short_id: r.id ? `${r.id.slice(0, 6)}...${r.id.slice(-4)}` : undefined,
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
