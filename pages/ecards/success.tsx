import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import Link from 'next/link';

const EcardSuccessPage: NextPage = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!router.isReady) return;
    const { session_id } = router.query;
    if (!session_id || typeof session_id !== 'string') {
      setStatus('error');
      setMessage('Invalid session ID.');
      return;
    }

    // Clear the cart from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ecardsCart');
    }

    // Call API to send eCard purchase emails
    fetch('/api/send-ecard-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Your purchase was successful! A confirmation email has been sent to you.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Something went wrong while sending confirmation emails.');
        }
      })
      .catch((err) => {
        console.error('Error sending eCard emails:', err);
        setStatus('error');
        setMessage('An error occurred while processing your order.');
      });
  }, [router.isReady, router.query]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        {status === 'loading' && <p className="text-lg">Processing your order...</p>}

        {status === 'success' && (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
            <p className="text-lg mb-6">{message}</p>
            <Link href="/ecards" className="btn btn-primary">
              Back to eCards
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Oops!</h1>
            <p className="text-lg mb-6">{message}</p>
            <Link href="/ecards" className="btn btn-primary">
              Back to eCards
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EcardSuccessPage; 