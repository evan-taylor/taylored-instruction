import type { Metadata } from "next";
import { generateOgImageUrl } from "@/lib/utils";

type OgImageType =
  | "default"
  | "bls"
  | "heartsaver"
  | "aha"
  | "lifeguarding"
  | "swimming";

type PageImageOptions = {
  title: string;
  description?: string;
  url?: string;
  type?: OgImageType;
};

export type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogType?: "website" | "article";
  image?: PageImageOptions;
  noIndex?: boolean;
};

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
      title: ogTitle,
      description: ogDescription,
      type: image?.type,
    });

  return {
    title,
    description,
    keywords: dedupeKeywords([...BASE_KEYWORDS, ...keywords]),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: ogType,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
              index: false,
              follow: false,
            },
          },
        }
      : {}),
  };
};
