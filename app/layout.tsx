import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import {
  generateJSONLD,
  getOrganizationSchema,
  getSLOLocalBusinessSchema,
  getVancouverLocalBusinessSchema,
  getWebSiteSchema,
} from "@/lib/structuredData";
import { PostHogPageViewWrapper, PostHogProvider } from "@/providers";

const readexPro = Readex_Pro({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-readex",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  authors: [
    { name: "Evan Taylor", url: "https://tayloredinstruction.com/about" },
  ],
  creator: "Taylored Instruction",
  description:
    "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified. Serving Clark County, Portland metro, and SLO County.",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
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
  metadataBase: new URL("https://tayloredinstruction.com"),
  openGraph: {
    description:
      "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified. Serving Clark County, Portland metro, and SLO County.",
    images: [
      {
        alt: "Taylored Instruction - Professional CPR & Lifeguard Training",
        height: 630,
        url: "/og-image.png",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: "Taylored Instruction",
    title:
      "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
    type: "website",
    url: "https://tayloredinstruction.com",
  },
  publisher: "Taylored Instruction",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title:
    "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
  twitter: {
    card: "summary_large_image",
    description:
      "Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. American Red Cross & AHA certified.",
    images: ["/twitter-image.png"],
    title:
      "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
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
        <PostHogProvider>
          {children}
          <PostHogPageViewWrapper />
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
