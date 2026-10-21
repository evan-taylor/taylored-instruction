import type { Metadata } from "next";
import { TestSignIn } from "@/components/auth/test-sign-in";

export const metadata: Metadata = {
  title: "Instructor Login | Taylored Instruction",
  description:
    "Login portal for Taylored Instruction instructors. Access instructor resources, eCards, and more.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div className="mx-auto max-w-md px-4 pb-12">
        <TestSignIn />
      </div>
    </>
  );
}
