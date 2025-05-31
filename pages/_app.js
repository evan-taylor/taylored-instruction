import { useEffect } from 'react';
import { useRouter } from 'next/router';
// Assuming you have a global CSS file
// Try importing from the app directory structure
import '../app/globals.css'; // Adjust the path if necessary

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const track = async (url) => {
      try {
        const params = new URLSearchParams(url.split('?')[1] || '');

        let stored = null;
        const utm = {
          utm_source: params.get('utm_source'),
          utm_medium: params.get('utm_medium'),
          utm_campaign: params.get('utm_campaign')
        };

        if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
          sessionStorage.setItem('utm_params', JSON.stringify(utm));
          stored = utm;
        } else {
          stored = JSON.parse(sessionStorage.getItem('utm_params') || 'null');
        }

        let location = {};
        if (process.env.NEXT_PUBLIC_IPINFO_TOKEN) {
          try {
            const res = await fetch(`https://ipinfo.io/json?token=${process.env.NEXT_PUBLIC_IPINFO_TOKEN}`);
            if (res.ok) location = await res.json();
          } catch (err) {
            console.error('Failed to fetch location', err);
          }
        }

        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.split('?')[0],
            referrer: document.referrer || null,
            ...(stored || {}),
            city: location.city,
            region: location.region,
            country: location.country
          })
        });
      } catch (e) {
        console.error('Analytics track failed', e);
      }
    };

    track(window.location.href);
    router.events.on('routeChangeComplete', track);
    return () => {
      router.events.off('routeChangeComplete', track);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}

export default MyApp; 