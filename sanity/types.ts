import type {
  PortableTextBlock,
  PortableTextMarkDefinition,
} from "@portabletext/types";
import type { SanityImageSource } from "@sanity/image-url";

export type BlogImage = SanityImageSource & {
  alt?: string;
};

export type BlogPostSummary = {
  _id: string;
  _updatedAt: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  author?: string;
  categories?: string[];
  mainImage?: BlogImage;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
};

export type LinkMark = PortableTextMarkDefinition & {
  _type: "link";
  href?: string;
};

export type BlogPortableTextBlock = PortableTextBlock<LinkMark>;

export type BlogPost = BlogPostSummary & {
  body?: BlogPortableTextBlock[];
};

export type BlogPostSlug = {
  slug: string;
};

export type BlogPostSitemapEntry = BlogPostSlug & {
  _updatedAt: string;
  publishedAt: string;
};
