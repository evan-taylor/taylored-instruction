import { createServerClientAppRouter } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/my-account'

  if (code) {
    const supabase = createServerClientAppRouter()
    try {
      await supabase.auth.exchangeCodeForSession(code)
      return NextResponse.redirect(new URL(next, req.url))
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', req.url))
    }
  } else {
    console.error('No code found in auth callback query parameters.')
    return NextResponse.redirect(new URL('/login?error=no_code_in_callback', req.url))
  }
}