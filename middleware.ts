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
          request.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user }, error: userErrorInMiddleware } = await supabase.auth.getUser()

  if (userErrorInMiddleware) {
    console.error('Middleware: Error from getUser() after updateSession:', userErrorInMiddleware);
  }
  console.log('Middleware: User from getUser() after updateSession:', user ? user.id : 'No user');

  const { pathname } = request.nextUrl

  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/api/auth/callback',
    '/products',
    '/about',
    '/contact',
    // Add other public paths as needed
  ]
  // Add paths that should be explicitly protected if not covered by the default deny
  const protectedRoutes = [
    '/my-account',
    '/ecards', // Assuming eCards is a protected route
    // Add other protected paths
  ]

  const ignoredPaths = ['/api/webhook'] // Paths to completely ignore by this auth logic

  const isIgnoredPath = ignoredPaths.some(path => pathname.startsWith(path))
  if (isIgnoredPath) {
    console.log(`Middleware: Path ${pathname} is ignored.`)
    return response // Return the response from updateSession
  }

  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || 
    (route !== '/' && pathname.startsWith(route + '/')) || // Matches /route/*
    (route !== '/' && pathname === route) // Matches /route exactly
  )

  // If the user is not authenticated
  if (!user) {
    // And the route is not public, redirect to login
    if (!isPublicRoute) {
      console.log(`Middleware: Redirecting unauthenticated user from ${pathname} to /login`);
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(loginUrl) // Create a new redirect response
    }
  } else {
    // If the user is authenticated
    // And they are trying to access login or signup, redirect to my-account
    if (pathname === '/login' || pathname === '/signup') {
      console.log(`Middleware: Redirecting authenticated user from ${pathname} to /my-account`);
      return NextResponse.redirect(new URL('/my-account', request.url)) // Create new redirect
    }
    // If accessing a specifically protected route (redundant if default is deny, but good for clarity)
    // This part of the logic might be optional if your default behavior is to protect all non-public routes.
    // For now, we'll rely on the !user && !isPublicRoute check for protection.
  }

  console.log(`Middleware: Allowing access to ${pathname} for user: ${user ? user.id : 'Guest'}`);
  return response // Return the response from updateSession (contains session cookies)
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