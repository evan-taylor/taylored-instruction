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
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  mainImage?: BlogImage;
  seoTitle?: string;
  seoDescription?: string;
};

export type LinkMark = PortableTextMarkDefinition & {
  _type: "link";
  href?: string;
};

export type BlogPortableTextBlock = PortableTextBlock<LinkMark>;

export type BlogPost = BlogPostSummary & {
  body?: BlogPortableTextBlock[];
};
