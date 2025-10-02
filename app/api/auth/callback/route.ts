import { type NextRequest, NextResponse } from "next/server";
import { createServerClientAppRouter } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/my-account";

  if (code) {
    const supabase = createServerClientAppRouter();
    try {
      const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        throw error;
      }

      // Update last_login timestamp for the user
      if (user?.id) {
        try {
          const now = new Date().toISOString();
          await db
            .update(profiles)
            .set({ lastLogin: now })
            .where(eq(profiles.id, user.id));
        } catch (dbError) {
          // Log the error but don't fail the auth flow
          console.error("Failed to update last_login:", dbError);
        }
      }

      return NextResponse.redirect(new URL(next, req.url));
    } catch (_error) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", req.url)
      );
    }
  } else {
    return NextResponse.redirect(
      new URL("/login?error=no_code_in_callback", req.url)
    );
  }
}
