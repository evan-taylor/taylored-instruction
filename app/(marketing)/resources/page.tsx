"use cache";

import { fetchQuery } from "convex/nextjs";
import { BookOpen, MapPin, Stethoscope } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle = "CPR, BLS, and Safety Training Resources";
const pageDescription =
  "Explore local CPR, BLS, first aid, AED, and workplace safety resources focused on Vancouver, Washington and surrounding communities, with additional San Luis Obispo content.";

export const metadata = buildPageMetadata({
  title: `${pageTitle} | Vancouver WA Focus`,
  description: pageDescription,
  path: "/resources",
  ogType: "article",
  keywords: [
    "CPR resources Vancouver WA",
    "BLS training guides Clark County WA",
    "first aid and AED articles Vancouver Washington",
    "corporate CPR planning resources",
    "San Luis Obispo CPR resources",
  ],
  image: {
    title: "CPR and BLS Resource Library",
    description:
      "Local training guides for Vancouver WA, Clark County, and San Luis Obispo",
  },
});

type ResourceCard = {
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  primaryKeyword: string;
  locationLabel: string;
  locationCity: string;
  serviceLine: string;
  readingTimeMinutes: number;
  updatedAt: string;
};

const formatUpdatedDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const getCityCount = (resources: ResourceCard[]) =>
  new Set(resources.map((resource) => resource.locationCity)).size;

const getServiceLineCount = (resources: ResourceCard[]) =>
  new Set(resources.map((resource) => resource.serviceLine)).size;

export default async function ResourcesPage() {
  const resources = await fetchQuery(
    api.seoContent.listPublishedPages,
    {}
  ).catch((_error) => {
    throw new Error("Published resources are temporarily unavailable.");
  });

  if (resources.length > 0) {
    cacheLife("hours");
  } else {
    cacheLife("minutes");
  }

  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/resources",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Resources", url: "https://tayloredinstruction.com/resources" },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Taylored Instruction SEO Resources",
    itemListElement: resources.map((resource, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        name: resource.title,
        url: `https://tayloredinstruction.com/resources/${resource.slug}`,
        description: resource.metaDescription,
      },
    })),
  };
  const resourcesSection = (() => {
    if (resources.length === 0) {
      return (
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="font-semibold text-2xl text-gray-900">
            New resources are being prepared
          </h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We are updating this library with published guides. In the meantime,
            you can reach us directly for course-specific questions.
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark"
              href="/contact"
            >
              Contact Taylored Instruction
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        {resources.map((resource) => (
          <article
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            key={resource.slug}
          >
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 text-xs">
                {resource.locationLabel}
              </span>
              <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 text-xs">
                {resource.serviceLine}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 text-xs">
                {resource.readingTimeMinutes} min read
              </span>
            </div>
            <h2 className="mt-4 font-semibold text-2xl text-gray-900 leading-tight">
              <Link
                className="hover:text-primary"
                href={`/resources/${resource.slug}`}
              >
                {resource.title}
              </Link>
            </h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              {resource.excerpt}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-gray-500 text-sm">
                Updated {formatUpdatedDate(resource.updatedAt)}
              </span>
              <Link
                className="font-medium text-primary text-sm hover:underline"
                href={`/resources/${resource.slug}`}
              >
                Read article
              </Link>
            </div>
          </article>
        ))}
      </div>
    );
  })();

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
      {resources.length > 0 ? (
        <script
          dangerouslySetInnerHTML={generateJSONLD(itemListSchema)}
          type="application/ld+json"
        />
      ) : null}

      <section className="border-gray-100 border-b bg-gray-50">
        <div className="container mx-auto px-4 py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-bold text-4xl text-gray-900 tracking-tight md:text-5xl">
              CPR, BLS & Workplace Safety Resource Library
            </h1>
            <p className="mt-5 text-gray-700 text-lg leading-relaxed">
              Practical, location-specific guidance built to support better
              emergency readiness in Vancouver, WA, Clark County, and nearby
              communities—with additional San Luis Obispo resources.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <BookOpen className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-gray-900">
                {resources.length} resources
              </p>
              <p className="text-gray-600 text-sm">Published pages</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <MapPin className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-gray-900">
                {getCityCount(resources)} locations
              </p>
              <p className="text-gray-600 text-sm">City-specific coverage</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Stethoscope className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-gray-900">
                {getServiceLineCount(resources)} service lines
              </p>
              <p className="text-gray-600 text-sm">Training categories</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {resourcesSection}
      </section>
    </div>
  );
}
