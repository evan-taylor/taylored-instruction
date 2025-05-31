-- Create analytics table to store page views
CREATE TABLE IF NOT EXISTS public.analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_id uuid references auth.users(id),
  ip_address text,
  city text,
  region text,
  country text
);

-- Enable RLS
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics rows
CREATE POLICY "Analytics insert" ON public.analytics
FOR INSERT WITH CHECK (true);

-- Allow select only for admins
CREATE POLICY "Analytics admin select" ON public.analytics
FOR SELECT USING (
  current_setting('request.jwt.claim.email', true) IN (
    'admin@tayloredinstruction.com',
    'evan@tayloredinstruction.com'
  )
);
