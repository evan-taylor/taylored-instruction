import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type GetServerSidePropsContext, type NextApiRequest, type NextApiResponse } from 'next'

// Helper to serialize cookie options for Pages Router
function serializeOptions(options: CookieOptions, override: Partial<CookieOptions> = {}): string {
  const mergedOptions = { ...options, ...override }
  let parts: string[] = []
  if (mergedOptions.maxAge) parts.push(`Max-Age=${mergedOptions.maxAge}`)
  if (mergedOptions.path) parts.push(`Path=${mergedOptions.path}`)
  if (mergedOptions.domain) parts.push(`Domain=${mergedOptions.domain}`)
  if (mergedOptions.httpOnly) parts.push('HttpOnly')
  if (mergedOptions.sameSite) parts.push(`SameSite=${mergedOptions.sameSite}`)
  // Do not add Secure flag in Pages Router for localhost development
  return parts.join('; ')
}

// Pages Router: getServerSideProps
export function createServerClientPagesRouter(
  context: GetServerSidePropsContext
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          context.res.setHeader('Set-Cookie', `${name}=${value}; ${serializeOptions(options)}`)
        },
        remove(name: string, options: CookieOptions) {
          context.res.setHeader(
            'Set-Cookie',
            `${name}=; ${serializeOptions(options, { maxAge: -1 })}`
          )
        },
      },
    }
  )
}

// Pages Router: API Routes
export function createApiClientPagesRouter(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieString = `${name}=${value}; ${serializeOptions(options)}`
          const existing = res.getHeader('Set-Cookie')
          let cookies: string[] = []
          if (!existing) {
            cookies = [cookieString]
          } else if (Array.isArray(existing)) {
            cookies = [...existing, cookieString]
          } else {
            cookies = [existing as string, cookieString]
          }
          res.setHeader('Set-Cookie', cookies)
        },
        remove(name: string, options: CookieOptions) {
          const cookieString = `${name}=; ${serializeOptions(options, { maxAge: -1 })}`
          const existing = res.getHeader('Set-Cookie')
          let cookies: string[] = []
          if (!existing) {
            cookies = [cookieString]
          } else if (Array.isArray(existing)) {
            cookies = [...existing, cookieString]
          } else {
            cookies = [existing as string, cookieString]
          }
          res.setHeader('Set-Cookie', cookies)
        },
      },
    }
  )
} 