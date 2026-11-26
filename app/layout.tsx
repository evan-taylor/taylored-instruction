import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import {
  PrivateAwareAnalytics,
  PrivateAwareSpeedInsights,
} from "@/components/registration/analytics";
import { ACCREDITATION_PHRASE, ACCREDITATION_SHORT } from "@/lib/business";
import {
  generateJSONLD,
  getOrganizationSchema,
  getWebSiteSchema,
} from "@/lib/structuredData";
import { generateOgImageUrl, OG_IMAGE_SIZE } from "@/lib/utils";
import { PostHogPageViewWrapper } from "@/providers";

const defaultOgImage = {
  url: generateOgImageUrl(
    "Professional CPR, BLS & Lifeguard Training",
    ACCREDITATION_SHORT
  ),
  ...OG_IMAGE_SIZE,
  alt: "Professional CPR, BLS & Lifeguard Training | Taylored Instruction",
};

const siteTitle = "CPR & BLS Training in Vancouver WA | Taylored Instruction";
const siteDescription = `Professional CPR, BLS, First Aid & Lifeguard training in Vancouver WA and San Luis Obispo CA. ${ACCREDITATION_PHRASE}.`;

const readexPro = Readex_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-readex",
});

/**
 * Edge-to-edge on notched phones (safe areas are padded back in CSS), the
 * keyboard shrinks the layout instead of covering bottom-pinned controls,
 * and the status bar matches the white header.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tayloredinstruction.com"),
  title: siteTitle,
  description: siteDescription,
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
    title: siteTitle,
    description: siteDescription,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [defaultOgImage],
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
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = getOrganizationSchema();
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
          dangerouslySetInnerHTML={generateJSONLD(websiteSchema)}
          key="website-jsonld"
          type="application/ld+json"
        />
      </head>
      <body className={readexPro.variable}>
        {children}
        <PostHogPageViewWrapper />
        <PrivateAwareAnalytics />
        <PrivateAwareSpeedInsights />
      </body>
    </html>
  );
}
