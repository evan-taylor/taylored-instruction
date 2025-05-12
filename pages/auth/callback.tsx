import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createServerClientPagesRouter } from '@/utils/supabase/server-pages';
import type { GetServerSidePropsContext } from 'next';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // After the auth flow is completed, redirect to the account page
    router.push('/my-account');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Completing login...</p>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // createServerClientPagesRouter expects the full context object
  const supabase = createServerClientPagesRouter(context);
  
  // The code exchange process happens here
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If there's no session, we might be in the middle of the OAuth flow
  if (!session) {
    return {
      props: {},
    };
  }

  // If there's a session, redirect to the account page
  return {
    redirect: {
      destination: '/my-account',
      permanent: false,
    },
  };
} 