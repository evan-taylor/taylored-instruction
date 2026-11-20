import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Instructor Resources | Taylored Instruction",
  description:
    "Access exclusive instructor resources, training materials, and documentation for Taylored Instruction certified instructors.",
  path: "/instructor-resources",
  image: { title: "Instructor resources", eyebrow: "For instructors" },
});

export default function InstructorResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
