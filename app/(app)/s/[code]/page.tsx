import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const offering = await fetchQuery(api.registration.detail, { code }).catch(
    () => null
  );
  return {
    title: offering
      ? `${offering.title} | Taylored Instruction`
      : "Class details | Taylored Instruction",
    description: offering?.description || undefined,
  };
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <RegistrationDetail code={code} />;
}
