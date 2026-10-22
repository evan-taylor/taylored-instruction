import type { Metadata } from "next";
import { ClassDiscovery } from "@/components/registration/public";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const title =
  "CPR, BLS, First Aid & Lifeguarding Classes | Vancouver WA | Taylored Instruction";
const description =
  "Browse upcoming American Red Cross and AHA classes in Vancouver, WA and Clark County. See every date, location, and the full price, then register online in minutes.";

export const metadata: Metadata = buildPageMetadata({
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
    description: "Dates, locations, and full pricing before you register",
  },
});

export default function Page() {
  const schemas = [
    getWebPageSchema({ name: title, description, path: "/classes" }),
    getBreadcrumbSchema([
      { name: "Home", url: SITE_URL },
      { name: "Classes", url: `${SITE_URL}/classes` },
    ]),
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
      <ClassDiscovery />
    </>
  );
}
