import { createBrowserClient } from "@supabase/ssr";
// import type { Database } from '@/types/supabase' // Commenting out type import

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
