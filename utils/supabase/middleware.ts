import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
// import type { Database } from '@/types/supabase' // Commenting out type import

export async function updateSession(request: NextRequest) {
  // Clone headers so we can forward extra context to route handlers
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Forward minimal auth context to downstream handlers to avoid extra lookups
  if (user?.id) {
    requestHeaders.set("x-user-id", user.id);
    if (user.email) {
      requestHeaders.set("x-user-email", user.email);
    }
    // Recreate the response to include updated headers
    supabaseResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return { response: supabaseResponse, user };
}
