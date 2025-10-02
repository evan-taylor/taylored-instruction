import { type NextRequest, NextResponse } from "next/server";
import { createServerClientAppRouter } from "@/utils/supabase/server";
import { db } from "@/db";
import { usersInAuth } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/my-account";

  if (code) {
    const supabase = createServerClientAppRouter();
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        throw error;
      }
      
      // Update last_sign_in_at for the user
      if (data.user?.id) {
        try {
          await db
            .update(usersInAuth)
            .set({ lastSignInAt: new Date().toISOString() })
            .where(eq(usersInAuth.id, data.user.id));
        } catch (dbError) {
          // Log the error but don't fail the auth flow
          console.error("Failed to update last_sign_in_at:", dbError);
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
