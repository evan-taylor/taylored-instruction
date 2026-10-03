import { RegistrationDetail } from "@/components/registration/public";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RegistrationDetail slug={slug} />;
}
