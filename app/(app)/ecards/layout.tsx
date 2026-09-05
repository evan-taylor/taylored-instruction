import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Purchase digital certification eCards for CPR, BLS, First Aid, and other safety training courses.",
  title: "Purchase eCards | Taylored Instruction",
};

export default function EcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
