import { createApiClientPagesRouter } from '@/utils/supabase/server-pages' // Use the API route client creator
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).end('Method Not Allowed')
    return
  }

  const code = req.query.code as string
  const next = req.query.next as string ?? '/my-account' // Default redirect to account page

  if (code) {
    const supabase = createApiClientPagesRouter(req, res)
    try {
      await supabase.auth.exchangeCodeForSession(code)
      // URL to redirect to after successful login
      res.redirect(next)
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to an error page or login page with error message
      res.redirect('/login?error=auth_callback_failed')
    }
  } else {
    console.error('No code found in auth callback query parameters.')
    // Redirect to an error page or login page
    res.redirect('/login?error=no_code_in_callback')
  }
} 