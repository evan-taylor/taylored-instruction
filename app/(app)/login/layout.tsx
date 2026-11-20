import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { buildPageMetadata } from "@/lib/seo";

const TestSignIn =
  process.env.NEXT_PUBLIC_REGISTRATION_TEST_LOGIN === "true"
    ? dynamic(() =>
        import("@/components/auth/test-sign-in").then((m) => m.TestSignIn)
      )
    : null;

export const metadata: Metadata = buildPageMetadata({
  title: "Sign in | Taylored Instruction",
  description: "Sign in for Taylored Instruction instructors and staff.",
  path: "/login",
  image: { title: "Sign in", eyebrow: "Instructors & staff" },
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {TestSignIn ? (
        <div className="mx-auto max-w-md px-4 pb-12">
          <TestSignIn />
        </div>
      ) : null}
    </>
  );
}
