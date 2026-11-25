import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import {
  ClassDiscovery,
  type DiscoveryFirstPage,
} from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { classListSchema, indexable } from "@/lib/registration-seo";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const title = "CPR & BLS Classes in Vancouver, WA | Taylored Instruction";
const description =
  "Upcoming CPR, BLS, First Aid and lifeguarding classes in Vancouver, WA and Clark County. See every date, location and the full price, then register online.";

export const metadata: Metadata = indexable(
  buildPageMetadata({
    title,
    description,
    path: "/classes",
    keywords: [
      "CPR classes near me",
      "BLS class Vancouver WA",
      "lifeguard class Vancouver WA",
      "first aid class Clark County",
      "register for CPR class online",
    ],
    image: {
      title: "Find your next class",
      eyebrow: "Class schedule",
    },
  })
);

/** Blocks on Convex so crawlers get the schedule in the first HTML response. */
export const instant = false;

type Props = { searchParams: Promise<{ q?: string | string[] }> };

/** The first page of classes, matching the search the client starts with. */
async function firstPage(q: string): Promise<DiscoveryFirstPage | undefined> {
  const search = q.trim().toLowerCase();
  return await fetchQuery(api.registration.discover, {
    paginationOpts: { numItems: 20, cursor: null },
    search: search || undefined,
  })
    .then(({ page }) => ({ search, page }))
    .catch(() => undefined);
}

export default async function Page({ searchParams }: Props) {
  const { q } = await searchParams;
  const initial = await firstPage(typeof q === "string" ? q : "");
  const schemas = [
    getWebPageSchema({ name: title, description, path: "/classes" }),
    getBreadcrumbSchema([
      { name: "Home", url: SITE_URL },
      { name: "Classes", url: `${SITE_URL}/classes` },
    ]),
    ...(initial?.page.length ? [classListSchema(initial.page)] : []),
  ];
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          dangerouslySetInnerHTML={generateJSONLD(schema)}
          // biome-ignore lint/suspicious/noArrayIndexKey: static list of distinct schema types
          key={index}
          type="application/ld+json"
        />
      ))}
      <ClassDiscovery initial={initial} />
    </>
  );
}
