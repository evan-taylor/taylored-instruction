import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Login portal for Taylored Instruction instructors. Access instructor resources, eCards, and more.",
  title: "Instructor Login | Taylored Instruction",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
