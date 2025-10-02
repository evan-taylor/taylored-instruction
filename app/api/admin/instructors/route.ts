export const runtime = "nodejs";

import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
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

  // First, get all profiles
  const profileRows = await db
    .select({
      id: profiles.id,
      is_instructor: profiles.isInstructor,
      updated_at: profiles.updatedAt,
      last_login: profiles.lastLogin,
    })
    .from(profiles)
    .orderBy(desc(profiles.updatedAt));

  // If there are no profiles, return early
  if (profileRows.length === 0) {
    return NextResponse.json([]);
  }

  // Get user emails using the database function
  const supabase = createServerClientAppRouter();
  const profileIds = profileRows.map((p) => p.id);

  const { data: emailData, error: emailError } = await supabase.rpc(
    "get_users_with_emails",
    { profile_ids: profileIds }
  );

  // If there's an error fetching emails, continue without them rather than failing completely
  if (emailError) {
    // Error is silently handled - emails will be null for affected users
  }

  // Create a map of user IDs to emails
  const emailMap = new Map<string, string>();
  if (emailData && Array.isArray(emailData)) {
    for (const row of emailData) {
      if (row.id && row.email) {
        emailMap.set(row.id, row.email);
      }
    }
  }

  const ID_PREFIX_LEN = 6;
  const ID_SUFFIX_LEN = 4;
  const payload = profileRows.map((r) => ({
    id: r.id,
    is_instructor: r.is_instructor,
    updated_at: r.updated_at,
    last_login: r.last_login,
    user_email: emailMap.get(r.id) || null,
    short_id: r.id
      ? `${r.id.slice(0, ID_PREFIX_LEN)}...${r.id.slice(-ID_SUFFIX_LEN)}`
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
