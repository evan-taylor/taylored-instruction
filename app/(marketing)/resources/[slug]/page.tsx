import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { buildPageMetadata } from "@/lib/seo";
import {
  getFallbackSeoPageBySlug,
  getFallbackSeoPages,
} from "@/lib/seoFallbackContent";
import { generateJSONLD, getBreadcrumbSchema } from "@/lib/structuredData";

type ResourcePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getResourcePage = async (slug: string) => {
  const convexPage = await fetchQuery(api.seoContent.getPublishedPageBySlug, {
    slug,
  }).catch(() => null);

  if (convexPage) {
    return convexPage;
  }

  return getFallbackSeoPageBySlug(slug);
};

export async function generateStaticParams() {
  const convexSlugs = await fetchQuery(api.seoContent.getPublishedPageSlugs, {})
    .then((items) => items)
    .catch(() => []);
  const slugs =
    convexSlugs.length > 0
      ? convexSlugs
      : getFallbackSeoPages().map((page) => ({
          slug: page.slug,
          updatedAt: page.updatedAt,
        }));
  return slugs.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata(
  props: ResourcePageProps
): Promise<Metadata> {
  const params = await props.params;
  const page = await getResourcePage(params.slug);

  if (!page) {
    return buildPageMetadata({
      title: "Resource Not Found",
      description:
        "The requested training resource could not be found on Taylored Instruction.",
      path: `/resources/${params.slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/resources/${page.slug}`,
    ogType: "article",
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    image: {
      title: page.title,
      description: page.metaDescription,
    },
  });
}

export default async function ResourceDetailPage(props: ResourcePageProps) {
  cacheLife("hours");

  const params = await props.params;
  const page = await getResourcePage(params.slug);

  if (!page) {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.metaDescription,
    datePublished: page.publishedAt ?? page.createdAt,
    dateModified: page.updatedAt,
    author: {
      "@type": "Organization",
      name: "Taylored Instruction",
    },
    publisher: {
      "@type": "Organization",
      name: "Taylored Instruction",
      logo: {
        "@type": "ImageObject",
        url: "https://tayloredinstruction.com/horizontal-logo-black.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://tayloredinstruction.com/resources/${page.slug}`,
    },
    articleSection: page.serviceLine,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords].join(", "),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Resources", url: "https://tayloredinstruction.com/resources" },
    {
      name: page.title,
      url: `https://tayloredinstruction.com/resources/${page.slug}`,
    },
  ]);

  return (
    <article className="bg-white">
      <script
        dangerouslySetInnerHTML={generateJSONLD(articleSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(faqSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />

      <section className="border-gray-100 border-b bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 text-xs">
              {page.locationLabel}
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 text-xs">
              {page.serviceLine}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 text-xs">
              {page.readingTimeMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 font-bold text-4xl text-gray-900 leading-tight md:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 text-gray-700 text-lg leading-relaxed">
            {page.excerpt}
          </p>
          <p className="mt-4 text-gray-500 text-sm">
            Updated {new Date(page.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-semibold text-2xl text-gray-900">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4 text-gray-700 leading-relaxed">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-5 list-disc space-y-2 pl-6 text-gray-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 pb-12">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-7">
          <h2 className="font-semibold text-2xl text-gray-900">
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-4">
            {page.faqItems.map((item) => (
              <div
                className="rounded-lg border border-gray-200 bg-white p-4"
                key={item.question}
              >
                <h3 className="font-medium text-gray-900">{item.question}</h3>
                <p className="mt-2 text-gray-700">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-xl bg-primary/5 p-8">
          <h2 className="font-semibold text-2xl text-gray-900">
            Ready to plan your training?
          </h2>
          <p className="mt-3 max-w-3xl text-gray-700">{page.ctaText}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark"
              href={page.ctaHref}
            >
              {page.ctaLabel}
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
              href="/resources"
            >
              Back to resources
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
