import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { isAdminEmail } from "@/lib/admin";

export default async function SeoContentAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await convexAuthNextjsToken();

  if (!token) {
    redirect("/login");
  }

  const profile = await fetchQuery(
    api.profiles.getProfile,
    {},
    {
      token,
    }
  ).catch(() => null);

  if (!isAdminEmail(profile?.email)) {
    redirect("/my-account");
  }

  return children;
}
