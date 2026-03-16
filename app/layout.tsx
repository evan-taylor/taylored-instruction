import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import Script from "next/script";
import {
  generateJSONLD,
  getOrganizationSchema,
  getSLOLocalBusinessSchema,
  getVancouverLocalBusinessSchema,
  getWebSiteSchema,
} from "@/lib/structuredData";

const readexPro = Readex_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-readex",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tayloredinstruction.com"),
  title:
    "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
  description:
    "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified. Serving Clark County, Portland metro, and SLO County.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "CPR training Vancouver WA",
    "BLS certification Vancouver WA",
    "First aid training Vancouver WA",
    "Lifeguard certification Vancouver WA",
    "CPR classes San Luis Obispo CA",
    "AHA training Vancouver WA",
    "Red Cross training Vancouver WA",
    "CPR training Clark County",
    "CPR certification San Luis Obispo",
    "Corporate CPR training Vancouver",
    "Healthcare CPR certification",
    "AED sales Vancouver WA",
  ],
  authors: [
    { name: "Evan Taylor", url: "https://tayloredinstruction.com/about" },
  ],
  creator: "Taylored Instruction",
  publisher: "Taylored Instruction",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tayloredinstruction.com",
    siteName: "Taylored Instruction",
    title:
      "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
    description:
      "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified. Serving Clark County, Portland metro, and SLO County.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taylored Instruction - Professional CPR & Lifeguard Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
    description:
      "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified.",
    images: ["/twitter-image.png"],
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
  verification: {
    // Add when available: google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate structured data for all pages
  const organizationSchema = getOrganizationSchema();
  const vancouverBusinessSchema = getVancouverLocalBusinessSchema();
  const sloBusinessSchema = getSLOLocalBusinessSchema();
  const websiteSchema = getWebSiteSchema();

  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for performance */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin=""
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link href="https://assets.onedollarstats.com" rel="preconnect" />

        <script
          dangerouslySetInnerHTML={generateJSONLD(organizationSchema)}
          key="organization-jsonld"
          type="application/ld+json"
        />

        <script
          dangerouslySetInnerHTML={generateJSONLD(vancouverBusinessSchema)}
          key="vancouver-business-jsonld"
          type="application/ld+json"
        />

        <script
          dangerouslySetInnerHTML={generateJSONLD(sloBusinessSchema)}
          key="slo-business-jsonld"
          type="application/ld+json"
        />

        <script
          dangerouslySetInnerHTML={generateJSONLD(websiteSchema)}
          key="website-jsonld"
          type="application/ld+json"
        />
      </head>
      <body className={readexPro.variable}>
        {children}
        <Script
          src="https://assets.onedollarstats.com/stonks.js"
          strategy="lazyOnload"
        />
        <Script
          data-persist
          data-token="e435884d-0dd1-4cd9-b1ae-a5e36a64e5f1"
          src="https://cdn.visitors.now/v.js"
          strategy="lazyOnload"
        />
        <Script id="apollo-lead-tracking" strategy="lazyOnload">
          {`function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"6943536a93fbdf001d996156"})},document.head.appendChild(o)}initApollo();`}
        </Script>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
