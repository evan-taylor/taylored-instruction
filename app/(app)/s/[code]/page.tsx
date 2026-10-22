import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { sessionMetadata, sessionSchemas } from "@/lib/registration-seo";
import { generateJSONLD } from "@/lib/structuredData";

type Props = { params: Promise<{ code: string }> };

async function offeringFor(code: string) {
  return await fetchQuery(api.registration.detail, { code }).catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const offering = await offeringFor(code);
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
  const offering = await offeringFor(code);
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
      <RegistrationDetail code={code} />
    </>
  );
}
