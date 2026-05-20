"use cache";

import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Image } from "next-sanity/image";
import { buildPageMetadata } from "@/lib/seo";
import { generateJSONLD, getBreadcrumbSchema } from "@/lib/structuredData";
import { sanityFetch } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { POST_QUERY, POST_SLUGS_QUERY } from "@/sanity/lib/queries";
import type {
  BlogPortableTextBlock,
  BlogPost,
  BlogPostSlug,
} from "@/sanity/types";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const heroImageWidth = 1200;
const heroImageHeight = 675;

const formatPublishedDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const isExternalHref = (href: string) =>
  href.startsWith("http://") || href.startsWith("https://");

const portableTextComponents: PortableTextComponents<BlogPortableTextBlock> = {
  block: {
    h2: ({ children }) => (
      <h2 className="mt-10 font-semibold text-3xl text-gray-900 leading-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 font-semibold text-2xl text-gray-900 leading-tight">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="mt-5 text-gray-700 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-primary border-l-4 pl-5 text-gray-700 italic leading-relaxed">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-5 list-disc space-y-2 pl-6 text-gray-700">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mt-5 list-decimal space-y-2 pl-6 text-gray-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href;
      if (!href) {
        return <>{children}</>;
      }

      return (
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={href}
          {...(isExternalHref(href)
            ? { rel: "noopener noreferrer", target: "_blank" }
            : {})}
        >
          {children}
        </Link>
      );
    },
  },
};

const getPost = async (slug: string) =>
  sanityFetch<BlogPost | null>(POST_QUERY, {
    params: { slug },
    tags: [`post:${slug}`, "post"],
  }).catch(() => null);

export async function generateStaticParams() {
  const posts = await sanityFetch<BlogPostSlug[]>(POST_SLUGS_QUERY, {
    tags: ["post"],
  }).catch(() => []);

  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  props: BlogPostPageProps
): Promise<Metadata> {
  const params = await props.params;
  const post = await getPost(params.slug);

  if (!post) {
    return buildPageMetadata({
      title: "Blog Post Not Found",
      description:
        "The requested blog post could not be found on Taylored Instruction.",
      noIndex: true,
      path: `/blog/${params.slug}`,
    });
  }

  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(heroImageWidth).height(heroImageHeight).url()
    : undefined;

  const authorName = post.author ?? "Taylored Instruction";
  const keywords = [...(post.categories ?? []), ...(post.seoKeywords ?? [])];
  const metadata = buildPageMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    ogType: "article",
    path: `/blog/${post.slug}`,
    keywords,
    image: {
      title: post.title,
      description: post.seoDescription ?? post.excerpt,
      url: imageUrl,
    },
  });

  return {
    ...metadata,
    authors: [{ name: authorName }],
    openGraph: {
      ...metadata.openGraph,
      authors: [authorName],
      modifiedTime: post._updatedAt,
      publishedTime: post.publishedAt,
      tags: keywords,
      type: "article",
    },
  };
}

export default async function BlogPostPage(props: BlogPostPageProps) {
  cacheLife("minutes");
  cacheTag("post");

  const params = await props.params;
  cacheTag(`post:${params.slug}`);
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(heroImageWidth).height(heroImageHeight).url()
    : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: {
      "@type": "Organization",
      name: post.author ?? "Taylored Instruction",
    },
    dateModified: post._updatedAt,
    datePublished: post.publishedAt,
    description: post.seoDescription ?? post.excerpt,
    headline: post.title,
    image: imageUrl ? [imageUrl] : undefined,
    inLanguage: "en-US",
    keywords: [...(post.categories ?? []), ...(post.seoKeywords ?? [])],
    mainEntityOfPage: {
      "@id": `https://tayloredinstruction.com/blog/${post.slug}`,
      "@type": "WebPage",
    },
    publisher: {
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: "https://tayloredinstruction.com/horizontal-logo-black.png",
      },
      name: "Taylored Instruction",
    },
  };
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Blog", url: "https://tayloredinstruction.com/blog" },
    {
      name: post.title,
      url: `https://tayloredinstruction.com/blog/${post.slug}`,
    },
  ]);

  return (
    <article className="bg-white">
      <script
        dangerouslySetInnerHTML={generateJSONLD(articleSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />

      <section className="border-gray-100 border-b bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <Link
            className="font-medium text-primary text-sm hover:underline"
            href="/blog"
          >
            Back to blog
          </Link>
          <h1 className="mt-4 font-bold text-4xl text-gray-900 leading-tight md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-gray-700 text-lg leading-relaxed">
            {post.excerpt}
          </p>
          <p className="mt-4 text-gray-500 text-sm">
            Published{" "}
            <time dateTime={post.publishedAt}>
              {formatPublishedDate(post.publishedAt)}
            </time>
          </p>
        </div>
      </section>

      {imageUrl ? (
        <section className="container mx-auto max-w-5xl px-4 pt-10">
          <Image
            alt={post.mainImage?.alt ?? post.title}
            className="aspect-video w-full rounded-xl object-cover"
            height={heroImageHeight}
            priority
            src={imageUrl}
            width={heroImageWidth}
          />
        </section>
      ) : null}

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <div className="text-lg">
          {post.body && post.body.length > 0 ? (
            <PortableText
              components={portableTextComponents}
              value={post.body}
            />
          ) : (
            <p className="text-gray-700">
              This post is being prepared. Please check back soon.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
