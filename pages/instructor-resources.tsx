import { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useProfile } from '../hooks/useProfile';

const InstructorResourcesPage: NextPage = () => {
  const router = useRouter();
  const { isInstructor, loading, session } = useProfile();

  useEffect(() => {
    if (loading) return; // Wait for loading to complete

    if (!session) {
      router.push('/login');
    } else if (!isInstructor) {
      router.push('/my-account');
    }
    // If session exists and isInstructor is true, do nothing and allow page to render
  }, [loading, session, isInstructor, router]);

  // Show loading UI while checking auth status or if redirection is imminent
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Loading instructor resources...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // After loading, if conditions for access are not met, show appropriate message
  // The useEffect should handle the actual redirect. This is fallback UI or pre-redirect UI.
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Access Denied. Redirecting to login...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Access Denied. Instructor status required. Redirecting to My Account...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If all checks pass, render the page content
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Use flex-1 and min-h-0 for main to ensure it takes available space and can shrink if needed */}
      <main className="flex-1 flex flex-col min-h-0"> 
          
        {/* iframe container: use flex-1 and min-h-0, remove rounded corners and shadow for max space */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden flex-1 min-h-0"> 
          <iframe 
            src="https://tayloredinstruction.notion.site/ebd/1b93d13e0dfd8008ba75c20b52611ce5" 
            style={{ width: '100%', height: '85vh', border: 'none' }} 
            allowFullScreen
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InstructorResourcesPage; 