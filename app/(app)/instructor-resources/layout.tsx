import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Access exclusive instructor resources, training materials, and documentation for Taylored Instruction certified instructors.",
  title: "Instructor Resources | Taylored Instruction",
};

export default function InstructorResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
