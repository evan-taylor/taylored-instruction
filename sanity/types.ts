import type {
  PortableTextBlock,
  PortableTextMarkDefinition,
} from "@portabletext/types";
import type { SanityImageSource } from "@sanity/image-url";

export type BlogImage = SanityImageSource & {
  alt?: string;
};

export interface BlogPostSummary {
  _id: string;
  _updatedAt: string;
  author?: string;
  categories?: string[];
  excerpt: string;
  mainImage?: BlogImage;
  publishedAt: string;
  seoDescription?: string;
  seoKeywords?: string[];
  seoTitle?: string;
  slug: string;
  title: string;
}

export type LinkMark = PortableTextMarkDefinition & {
  _type: "link";
  href?: string;
};

export type BlogPortableTextBlock = PortableTextBlock<LinkMark>;

export type BlogPost = BlogPostSummary & {
  body?: BlogPortableTextBlock[];
};

export interface BlogPostSlug {
  slug: string;
}

export type BlogPostSitemapEntry = BlogPostSlug & {
  _updatedAt: string;
  publishedAt: string;
};
