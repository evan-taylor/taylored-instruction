import { RegistrationDetail } from "@/components/registration/public";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RegistrationDetail code={code} />;
}
