import type { Metadata } from "next";
import { generateOgImageUrl, OG_IMAGE_SIZE } from "@/lib/utils";

type PageImageOptions = {
  title: string;
  eyebrow?: string;
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
  const ogImage = {
    url: generateOgImageUrl(image?.title ?? title, image?.eyebrow),
    ...OG_IMAGE_SIZE,
    alt: `${image?.title ?? title} | ${SITE_NAME}`,
  };

  return {
    title,
    description,
    keywords: dedupeKeywords(keywords),
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
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
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
