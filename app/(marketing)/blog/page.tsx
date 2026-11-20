"use cache";

import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { getRevnuPostHref, getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";
import { type BuildPageMetadataInput, buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle = "Taylored Instruction Blog";
const pageDescription =
  "Read CPR, BLS, first aid, AED, lifeguarding, and workplace safety articles from Taylored Instruction.";
const cardImageWidth = 800;
const cardImageHeight = 450;
const listingLimit = 12;

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
  image: {
    title: "CPR, BLS, first aid & lifeguarding articles",
    eyebrow: "Blog",
  },
};

const formatPublishedDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(blogPageMetadata);
}

export default async function BlogPage() {
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const posts = await getRevnuPosts().catch(() => []);
  const postList = posts.slice(0, listingLimit);
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
        description: post.metaDescription,
        name: post.title,
        dateModified: new Date(
          post.updatedAt ?? post.publishedAt
        ).toISOString(),
        datePublished: new Date(post.publishedAt).toISOString(),
        url: post.canonicalUrl,
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

      <section className="border-slate-100 border-b bg-slate-50">
        <div className="container mx-auto px-4 py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-bold text-4xl text-slate-900 tracking-tight md:text-5xl">
              CPR, BLS, and safety training blog
            </h1>
            <p className="mt-5 text-lg text-slate-700 leading-relaxed">
              Practical articles from Taylored Instruction on emergency
              readiness, instructor development, safety training, and course
              planning.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {postList.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h2 className="mt-3 font-semibold text-2xl text-slate-900">
              New blog posts are being prepared
            </h2>
            <p className="mt-3 text-slate-700 leading-relaxed">
              We are setting up the blog library. In the meantime, you can
              browse upcoming classes or contact us for course-specific
              guidance.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark"
                href="/classes"
              >
                Browse classes
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
                href="/contact"
              >
                Contact us
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postList.map((post) => {
              const href = getRevnuPostHref(post.canonicalPath);
              const publishedAt = new Date(post.publishedAt);

              return (
                <article
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md"
                  key={post.canonicalPath}
                >
                  {post.heroImageUrl ? (
                    <Image
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                      height={cardImageHeight}
                      src={post.heroImageUrl}
                      unoptimized
                      width={cardImageWidth}
                    />
                  ) : null}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      <time dateTime={publishedAt.toISOString()}>
                        {formatPublishedDate(publishedAt)}
                      </time>
                    </div>
                    <h2 className="mt-3 font-semibold text-2xl text-slate-900 leading-tight">
                      <Link className="hover:text-primary" href={href}>
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-slate-700 leading-relaxed">
                      {post.metaDescription}
                    </p>
                    <Link
                      className="mt-5 inline-flex font-medium text-primary text-sm hover:underline"
                      href={href}
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
