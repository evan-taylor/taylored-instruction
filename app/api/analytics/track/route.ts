import { NextRequest, NextResponse } from 'next/server'
import { createServerClientAppRouter } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServerClientAppRouter()

  const { url, referrer, utm_source, utm_medium, utm_campaign, city, region, country } = await req.json() || {}

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
    ip_address: req.headers.get('x-forwarded-for') || req.ip || undefined
  })

  if (error) {
    console.error('Analytics insert error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}