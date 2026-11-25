import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cache } from "react";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { sessionMetadata, sessionSchemas } from "@/lib/registration-seo";
import { generateJSONLD } from "@/lib/structuredData";

/** Blocks on Convex so crawlers get the schedule in the first HTML response. */
export const instant = false;

type Props = { params: Promise<{ code: string }> };

/** Staff can open admin-only classes, so the server reads as the visitor. */
const sessionFor = cache(async (code: string) => {
  const preloaded = await preloadQuery(
    api.registration.detail,
    { code },
    { token: await convexAuthNextjsToken() }
  );
  return { preloaded, offering: preloadedQueryResult(preloaded) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const { offering } = await sessionFor(code);
  if (!offering) {
    return {
      title: "Class details | Taylored Instruction",
      robots: { index: false, follow: true },
    };
  }
  return sessionMetadata(offering);
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  const { preloaded, offering } = await sessionFor(code);
  return (
    <>
      {offering && !offering.unlisted
        ? sessionSchemas(offering).map((schema, index) => (
            <script
              dangerouslySetInnerHTML={generateJSONLD(schema)}
              // biome-ignore lint/suspicious/noArrayIndexKey: static list of distinct schema types
              key={index}
              type="application/ld+json"
            />
          ))
        : null}
      <RegistrationDetail code={code} preloaded={preloaded} />
    </>
  );
}
