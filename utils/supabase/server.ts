import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next"; // For Pages Router
import { cookies } from "next/headers"; // For App Router
// import type { Database } from '@/types/supabase' // Commenting out type import

// --- App Router ---
// Utility to create a Supabase client for Server Components, Route Handlers, Server Actions
export function createServerClientAppRouter() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (_error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: -1,
          });
        } catch (_error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// --- Pages Router ---
// Utility to create a Supabase client for getServerSideProps
export function createServerClientPagesRouter(
  context: GetServerSidePropsContext
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return context.req.cookies[name];
      },
      set(name: string, value: string, options: CookieOptions) {
        context.res.setHeader(
          "Set-Cookie",
          `${name}=${value}; ${serializeOptions(options)}`
        );
      },
      remove(name: string, options: CookieOptions) {
        context.res.setHeader(
          "Set-Cookie",
          `${name}=; ${serializeOptions(options, { maxAge: -1 })}`
        );
      },
    },
  });
}

// Utility to create a Supabase client for API Routes in Pages Router
export function createApiClientPagesRouter(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name];
      },
      set(name: string, value: string, options: CookieOptions) {
        // Accumulate multiple Set-Cookie headers
        const cookieString = `${name}=${value}; ${serializeOptions(options)}`;
        const existing = res.getHeader("Set-Cookie");
        let setCookieHeaders: string[];
        if (!existing) {
          setCookieHeaders = [cookieString];
        } else if (Array.isArray(existing)) {
          setCookieHeaders = [...existing, cookieString];
        } else {
          setCookieHeaders = [existing as string, cookieString];
        }
        res.setHeader("Set-Cookie", setCookieHeaders);
      },
      remove(name: string, options: CookieOptions) {
        // Accumulate removal Set-Cookie headers
        const cookieString = `${name}=; ${serializeOptions(options, { maxAge: -1 })}`;
        const existing = res.getHeader("Set-Cookie");
        let setCookieHeaders: string[];
        if (!existing) {
          setCookieHeaders = [cookieString];
        } else if (Array.isArray(existing)) {
          setCookieHeaders = [...existing, cookieString];
        } else {
          setCookieHeaders = [existing as string, cookieString];
        }
        res.setHeader("Set-Cookie", setCookieHeaders);
      },
    },
  });
}

// Helper to serialize cookie options (you might need to implement or import this)
// Example basic serialization:
function serializeOptions(
  options: CookieOptions,
  override: Partial<CookieOptions> = {}
): string {
  const mergedOptions = { ...options, ...override };
  const parts: string[] = [];
  if (mergedOptions.maxAge) {
    parts.push(`Max-Age=${mergedOptions.maxAge}`);
  }
  if (mergedOptions.path) {
    parts.push(`Path=${mergedOptions.path}`);
  }
  if (mergedOptions.domain) {
    parts.push(`Domain=${mergedOptions.domain}`);
  }

  // Only set Secure flag if not in development (localhost)
  // Forcing secure to false in dev if NODE_ENV is 'development' to be safe.
  if (mergedOptions.secure && process.env.NODE_ENV !== "development") {
    // In production or other environments, respect the secure flag from options.
    parts.push("Secure");
  }

  if (mergedOptions.httpOnly) {
    parts.push("HttpOnly");
  }
  if (mergedOptions.sameSite) {
    parts.push(`SameSite=${mergedOptions.sameSite}`);
  }
  return parts.join("; ");
}
