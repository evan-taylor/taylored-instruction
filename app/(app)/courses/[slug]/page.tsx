import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { nativeRegistrationEnabled } from "@/lib/registration-launch";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offering = await fetchQuery(api.registration.detail, { slug }).catch(
    () => null
  );
  return {
    title: offering
      ? `${offering.title} | Taylored Instruction`
      : "Course details | Taylored Instruction",
    description: offering?.description || undefined,
    robots:
      nativeRegistrationEnabled() && offering
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <RegistrationDetail slug={slug} />;
}
