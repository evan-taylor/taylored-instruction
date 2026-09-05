import type { Metadata } from "next";
import { generateOgImageUrl } from "@/lib/utils";

type OgImageType =
  | "default"
  | "bls"
  | "heartsaver"
  | "aha"
  | "lifeguarding"
  | "swimming";

interface PageImageOptions {
  description?: string;
  title: string;
  type?: OgImageType;
  url?: string;
}

export interface BuildPageMetadataInput {
  description: string;
  image?: PageImageOptions;
  keywords?: string[];
  noIndex?: boolean;
  ogType?: "website" | "article";
  path: string;
  title: string;
}

export const SITE_URL = "https://tayloredinstruction.com";
export const SITE_NAME = "Taylored Instruction";

const BASE_KEYWORDS = [
  "CPR training Vancouver WA",
  "BLS certification Vancouver WA",
  "First Aid training Vancouver WA",
  "Lifeguard certification Vancouver WA",
  "CPR classes San Luis Obispo CA",
  "workplace safety training",
  "American Red Cross training",
  "American Heart Association training",
];

const dedupeKeywords = (keywords: string[]): string[] =>
  Array.from(
    new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))
  );

export const absoluteUrl = (path: string): string =>
  new URL(path, SITE_URL).toString();

export const buildPageMetadata = ({
  title,
  description,
  path,
  keywords = [],
  ogType = "website",
  image,
  noIndex = false,
}: BuildPageMetadataInput): Metadata => {
  const canonicalUrl = absoluteUrl(path);
  const ogTitle = image?.title ?? title;
  const ogDescription = image?.description ?? description;
  const ogImageUrl =
    image?.url ??
    generateOgImageUrl({
      description: ogDescription,
      title: ogTitle,
      type: image?.type,
    });

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description,
    keywords: dedupeKeywords([...BASE_KEYWORDS, ...keywords]),
    openGraph: {
      description,
      images: [
        {
          alt: ogTitle,
          height: 630,
          url: ogImageUrl,
          width: 1200,
        },
      ],
      locale: "en_US",
      siteName: SITE_NAME,
      title,
      type: ogType,
      url: canonicalUrl,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImageUrl],
      title,
    },
    ...(noIndex
      ? {
          robots: {
            follow: false,
            googleBot: {
              follow: false,
              index: false,
            },
            index: false,
            nocache: true,
          },
        }
      : {}),
  };
};
