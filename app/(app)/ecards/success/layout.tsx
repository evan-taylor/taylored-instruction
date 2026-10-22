import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Your eCard purchase has been completed successfully.",
  title: "Purchase Complete | Taylored Instruction",
};

export default function EcardsSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
