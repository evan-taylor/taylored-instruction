import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiClientPagesRouter } from '@/utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createApiClientPagesRouter(req, res)

  const { url, referrer, utm_source, utm_medium, utm_campaign, city, region, country } = req.body || {}

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('analytics').insert({
    url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    city,
    region,
    country,
    user_id: user ? user.id : null,
    ip_address: (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string | undefined
  })

  if (error) {
    console.error('Analytics insert error', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
