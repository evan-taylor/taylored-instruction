"use cache";

import { BookOpen, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Image } from "next-sanity/image";
import { type BuildPageMetadataInput, buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";
import { sanityFetch } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { POSTS_QUERY } from "@/sanity/lib/queries";
import type { BlogPostSummary } from "@/sanity/types";

const pageTitle = "Taylored Instruction Blog";
const pageDescription =
  "Read CPR, BLS, first aid, AED, lifeguarding, and workplace safety articles from Taylored Instruction.";
const cardImageWidth = 800;
const cardImageHeight = 450;

const blogPageMetadata: BuildPageMetadataInput = {
  title: pageTitle,
  description: pageDescription,
  path: "/blog",
  keywords: [
    "CPR blog Vancouver WA",
    "BLS training articles",
    "first aid and AED blog",
    "lifeguarding training articles",
  ],
};

const formatPublishedDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(blogPageMetadata);
}

export default async function BlogPage() {
  cacheLife("minutes");
  cacheTag("post");

  const posts = await sanityFetch<BlogPostSummary[]>(POSTS_QUERY, {
    tags: ["post"],
  }).catch(() => null);

  const postList = posts ?? [];
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/blog",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Blog", url: "https://tayloredinstruction.com/blog" },
  ]);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Taylored Instruction Blog",
    itemListElement: postList.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        description: post.excerpt,
        name: post.title,
        dateModified: post._updatedAt,
        datePublished: post.publishedAt,
        url: `https://tayloredinstruction.com/blog/${post.slug}`,
      },
    })),
  };

  return (
    <div className="bg-white">
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      {postList.length > 0 ? (
        <script
          dangerouslySetInnerHTML={generateJSONLD(itemListSchema)}
          type="application/ld+json"
        />
      ) : null}

      <section className="border-gray-100 border-b bg-gray-50">
        <div className="container mx-auto px-4 py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-bold text-4xl text-gray-900 tracking-tight md:text-5xl">
              CPR, BLS & Safety Training Blog
            </h1>
            <p className="mt-5 text-gray-700 text-lg leading-relaxed">
              Practical articles from Taylored Instruction on emergency
              readiness, instructor development, safety training, and course
              planning.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {postList.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold text-2xl text-gray-900">
              New blog posts are being prepared
            </h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              We are setting up the blog library. In the meantime, you can
              browse the resource library or contact us for course-specific
              guidance.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark"
                href="/resources"
              >
                Browse resources
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
                href="/contact"
              >
                Contact us
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postList.map((post) => {
              const imageUrl = post.mainImage
                ? urlFor(post.mainImage)
                    .width(cardImageWidth)
                    .height(cardImageHeight)
                    .url()
                : null;

              return (
                <article
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  key={post._id}
                >
                  {imageUrl ? (
                    <Image
                      alt={post.mainImage?.alt ?? post.title}
                      className="aspect-video w-full object-cover"
                      height={cardImageHeight}
                      src={imageUrl}
                      width={cardImageWidth}
                    />
                  ) : null}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      <time dateTime={post.publishedAt}>
                        {formatPublishedDate(post.publishedAt)}
                      </time>
                    </div>
                    <h2 className="mt-3 font-semibold text-2xl text-gray-900 leading-tight">
                      <Link
                        className="hover:text-primary"
                        href={`/blog/${post.slug}`}
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-gray-700 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <Link
                      className="mt-5 inline-flex font-medium text-primary text-sm hover:underline"
                      href={`/blog/${post.slug}`}
                    >
                      Read article
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
