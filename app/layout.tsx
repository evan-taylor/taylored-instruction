import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import {
  getOrganizationSchema,
  getVancouverLocalBusinessSchema,
  getSanLuisObispoLocalBusinessSchema,
  renderJsonLd,
} from "@/lib/seo/schemas";

const readexPro = Readex_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-readex",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tayloredinstruction.com"),
  title: {
    default: "Taylored Instruction | CPR & BLS Training Vancouver WA & San Luis Obispo CA",
    template: "%s | Taylored Instruction"
  },
  description:
    "Get certified in CPR, BLS, First Aid, and Lifeguarding in Vancouver WA & San Luis Obispo CA. American Red Cross & AHA authorized training provider. Expert instruction for healthcare professionals and the community.",
  keywords: [
    "CPR training Vancouver WA",
    "BLS certification Vancouver WA",
    "First Aid training Vancouver WA",
    "Lifeguard certification Vancouver WA",
    "CPR classes San Luis Obispo",
    "AHA BLS Vancouver",
    "Red Cross training Vancouver",
    "Clark County CPR",
    "Healthcare CPR certification",
    "Corporate CPR training",
    "Lifeguarding certification",
    "AED training",
    "CPR instructor training",
    "Vancouver Washington CPR",
    "Battle Ground CPR",
    "Camas CPR training",
    "Portland CPR classes"
  ],
  authors: [{ name: "Evan Taylor", url: "https://tayloredinstruction.com/about" }],
  creator: "Taylored Instruction",
  publisher: "Taylored Instruction",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-verification-code',
  },
  alternates: {
    canonical: "https://tayloredinstruction.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tayloredinstruction.com",
    siteName: "Taylored Instruction",
    title: "Taylored Instruction | CPR & BLS Training Vancouver WA & San Luis Obispo CA",
    description:
      "Get certified in CPR, BLS, First Aid, and Lifeguarding in Vancouver WA & San Luis Obispo CA. American Red Cross & AHA authorized training provider.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taylored Instruction - CPR and Safety Training",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taylored Instruction | CPR & BLS Training Vancouver WA & San Luis Obispo CA",
    description:
      "Get certified in CPR, BLS, First Aid, and Lifeguarding in Vancouver WA & San Luis Obispo CA. American Red Cross & AHA authorized training provider.",
    images: ["/twitter-image.png"],
    creator: "@tayloredinstruction",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", type: "image/png", sizes: "192x192" }
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = getOrganizationSchema();
  const vancouverBusinessSchema = getVancouverLocalBusinessSchema();
  const sloBusinessSchema = getSanLuisObispoLocalBusinessSchema();

  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.onedollarstats.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* Geographic targeting meta tags */}
        <meta name="geo.region" content="US-WA" />
        <meta name="geo.placename" content="Vancouver" />
        <meta name="geo.position" content="45.6387;-122.6615" />
        <meta name="ICBM" content="45.6387, -122.6615" />
        
        {/* Additional location for San Luis Obispo */}
        <meta name="geo.region" content="US-CA" />
        <meta name="geo.placename" content="San Luis Obispo" />
        
        {/* Business information */}
        <meta name="author" content="Taylored Instruction, Evan Taylor" />
        <meta name="contact" content="evan@tayloredinstruction.com" />
        <meta name="reply-to" content="evan@tayloredinstruction.com" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Organization JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(organizationSchema)}
        />
        
        {/* Vancouver Local Business JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(vancouverBusinessSchema)}
        />
        
        {/* San Luis Obispo Local Business JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(sloBusinessSchema)}
        />
        
        {/* Analytics - deferred for performance */}
        <script defer src="https://assets.onedollarstats.com/stonks.js" />
      </head>
      <body className={readexPro.variable}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-grow">{children}</main>
          <Footer />
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
