import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Purchase eCards | Taylored Instruction",
  description:
    "Purchase digital certification eCards for CPR, BLS, First Aid, and other safety training courses.",
  path: "/ecards",
  image: { title: "Purchase certification eCards", eyebrow: "For instructors" },
});

export default function EcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
