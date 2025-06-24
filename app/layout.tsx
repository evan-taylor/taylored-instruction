import './globals.css'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  metadataBase: new URL('https://tayloredinstruction.com'),
  title: 'Taylored Instruction | BLS/CPR Training in Vancouver WA',
  description: 'Get certified in CPR and lifeguarding. Join our CPR Training in Vancouver WA to learn essential life-saving techniques today.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tayloredinstruction.com',
    siteName: 'Taylored Instruction',
    title: 'Taylored Instruction | BLS/CPR Training in Vancouver WA',
    description: 'Get certified in CPR and lifeguarding. Join our CPR Training in Vancouver WA to learn essential life-saving techniques today.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Taylored Instruction Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taylored Instruction | BLS/CPR Training in Vancouver WA',
    description: 'Get certified in CPR and lifeguarding. Join our CPR Training in Vancouver WA to learn essential life-saving techniques today.',
    images: ['/twitter-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
} 