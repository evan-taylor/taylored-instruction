import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Manage your Taylored Instruction instructor account, view instructor status, and access resources.",
  title: "My Account | Taylored Instruction",
};

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
