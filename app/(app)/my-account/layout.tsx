import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "My Account | Taylored Instruction",
  description:
    "Manage your Taylored Instruction instructor account, view instructor status, and access resources.",
  path: "/my-account",
  image: { title: "My account", eyebrow: "Instructors" },
});

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
