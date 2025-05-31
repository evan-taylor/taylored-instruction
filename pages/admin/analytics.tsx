import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useProfile } from '../../hooks/useProfile';
import { createClient } from '@/utils/supabase/client';

interface AnalyticsRow {
  created_at: string;
  url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

const AnalyticsAdminPage: NextPage = () => {
  const router = useRouter();
  const { loading, session } = useProfile();
  const [supabase] = useState(() => createClient());
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const email = session?.user?.email;
    if (email) {
      const admins = ['admin@tayloredinstruction.com', 'evan@tayloredinstruction.com'];
      setIsAdmin(admins.includes(email));
    }
  }, [session]);

  useEffect(() => {
    const fetchData = async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 1);
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .gte('created_at', since.toISOString());
      if (error) {
        setError(error.message);
      } else {
        setData(data || []);
      }
    };
    if (isAdmin) fetchData();
  }, [isAdmin, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-lg">Verifying admin access...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.push('/my-account');
    return null;
  }

  const totals = {
    daily: 0,
    weekly: 0,
    monthly: data.length
  };
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  data.forEach(row => {
    const created = new Date(row.created_at).getTime();
    const diff = today.getTime() - created;
    if (diff <= oneDay) totals.daily++;
    if (diff <= 7 * oneDay) totals.weekly++;
  });

  const sources: Record<string, number> = {};
  data.forEach(row => {
    if (row.utm_source) {
      sources[row.utm_source] = (sources[row.utm_source] || 0) + 1;
    }
  });
  const topSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Site Analytics</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div className="mb-6">
          <p className="mb-2">Daily Visitors: {totals.daily}</p>
          <p className="mb-2">Weekly Visitors: {totals.weekly}</p>
          <p className="mb-2">Monthly Visitors: {totals.monthly}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Top Sources</h2>
          <ul className="list-disc list-inside">
            {topSources.map(([source, count]) => (
              <li key={source}>{source}: {count}</li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnalyticsAdminPage;
