import { useEffect, useState } from 'react';
import { NextPage, GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useProfile } from '../hooks/useProfile';
import Link from 'next/link';
import { createServerClientPagesRouter } from '@/utils/supabase/server-pages';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface MyAccountPageProps {
  user: User;
}

const MyAccountPage: NextPage<MyAccountPageProps> = ({ user }) => {
  const router = useRouter();
  const [supabaseClient] = useState(() => createClient());
  
  const { 
    profile, 
    loading, 
    isInstructor, 
    email
  } = useProfile(user?.id);
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userEmail = user?.email;
    if (userEmail) {
      const adminEmails = [
          'admin@tayloredinstruction.com',
          'evan@tayloredinstruction.com',
      ].filter(Boolean);
      setIsAdmin(adminEmails.includes(userEmail));
    } else {
       setIsAdmin(false);
    }
  }, [user]);

  if (loading || !profile && user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Loading account information...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return <p>Redirecting to login...</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">My Account</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            
            <div className="mb-4">
              <p className="text-gray-600">Email:</p>
              <p className="font-medium">{user.email || 'Not available'}</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">Instructor Status:</p>
              <p className="font-medium">
                {isInstructor ? (
                  <span className="text-green-600">Approved Instructor</span>
                ) : (
                  <span className="text-yellow-600">Pending Approval</span>
                )}
              </p>
              {!isInstructor && profile && (
                <p className="text-sm text-gray-500 mt-1">
                  Your instructor status is pending approval from an administrator.
                </p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="space-y-2">
              {isInstructor && profile && (
                <>
                  <Link href="/ecards" className="text-primary hover:underline block">
                    Purchase eCards
                  </Link>
                  <Link href="/instructor-resources" className="text-primary hover:underline block">
                    Instructor Resources
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin/instructors" className="text-primary hover:underline block">
                  Manage Instructors (Admin)
                </Link>
              )}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              const { error } = await supabaseClient.auth.signOut();
              if (error) {
                  console.error("Logout error:", error);
              } else {
                  router.push('/'); 
              }
            }}
            className="w-full md:w-auto px-6 py-3 text-sm font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-red-600 rounded-lg hover:bg-red-500 focus:outline-none focus:ring focus:ring-red-300 focus:ring-opacity-50"
          >
            Sign Out
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createServerClientPagesRouter(ctx);
  const { data: { user }, error: gsspUserError } = await supabase.auth.getUser();
  
  if (gsspUserError) {
    console.error('my-account GSSP: Error fetching user server-side:', gsspUserError.message);
  }

  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return {
    props: {
      user: user,
    },
  };
};

export default MyAccountPage; 