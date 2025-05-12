import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
// import type { Database } from '@/types/supabase' // Commenting out type import

export async function updateSession(request: NextRequest) {
  // This response object will be modified by the Supabase client below.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If a cookie is set, update the request cookies for this instance
          // AND directly update the cookies on the response object.
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // If a cookie is removed, update the request cookies for this instance
          // AND directly update the cookies on the response object.
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Crucial: This call to getUser() will refresh the session if needed
  // and update the cookies in the `response` object via the `set`/`remove` handlers defined above.
  await supabase.auth.getUser()

  return response
} 