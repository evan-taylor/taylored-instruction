import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware' // Import the corrected helper
// To get user info within the middleware for routing decisions, we might need a client instance here.
// However, this client should use the request object that updateSession has potentially modified.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
// import type { Database } from '@/types/supabase' // Commenting out type import for now

export async function middleware(request: NextRequest) {
  // updateSession handles session refresh and updates cookies in the response.
  // It returns a response object that should be used or have its headers merged.
  let response = await updateSession(request) // request might be mutated by updateSession for its cookies

  // For routing decisions, if you need user data, create a Supabase client
  // that reads from the (potentially updated by updateSession) request.cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // For this client instance, used primarily for `getUser` for routing,
        // we only need to update request.cookies for its internal consistency.
        // The main `response` object (from updateSession) already has session cookies handled.
        set(name: string, value: string, options: CookieOptions) {
          // Update request cookies for Supabase client internal consistency
          request.cookies.set({ name, value, ...options })
          // The main response object (response) is already handled by updateSession
          // and will contain the latest session cookies.
          // We might need to ensure that `response` is correctly passed along or its headers merged
          // if `updateSession` itself doesn't return `NextResponse.next()` and we are modifying cookies here.
          // For now, assuming `updateSession` sets cookies on the response it returns.
        },
        remove(name: string, options: CookieOptions) {
          // Update request cookies for Supabase client internal consistency
          request.cookies.set({ name, value: '', ...options })
          // Similar to set, updateSession's response is the source of truth for browser cookies.
        },
      },
    }
  )

  const { data: { user }, error: userErrorInMiddleware } = await supabase.auth.getUser()

  if (userErrorInMiddleware) {
    console.error('Middleware: Error from getUser() after updateSession:', userErrorInMiddleware);
  }

  const { pathname } = request.nextUrl

  // Add paths that should be explicitly protected if not covered by the default deny
  const protectedRoutes = [
    '/my-account',
    '/ecards', // Assuming eCards is a protected route
    // Add other protected paths
  ]

  const ignoredPaths = ['/api/webhook'] // Paths to completely ignore by this auth logic

  const isIgnoredPath = ignoredPaths.some(path => pathname.startsWith(path))
  if (isIgnoredPath) {
    return response // Use the response from updateSession
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // If the user is not authenticated
  if (!user) {
    // And the route is protected, redirect to login
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectedFrom', pathname)
      // Return a new redirect response, not modifying the one from updateSession directly here
      return NextResponse.redirect(loginUrl)
    }
  } else {
    // If the user is authenticated
    // And they are trying to access login or signup, redirect to my-account
    if (pathname === '/login' || pathname === '/signup') {
      // Return a new redirect response
      return NextResponse.redirect(new URL('/my-account', request.url))
    }
  }
  // If no redirects occurred, return the response from updateSession (which contains session cookies)
  return response
}

// Matcher config remains the same
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 