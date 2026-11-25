import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribePage } from "@/components/registration/unsubscribe";

export const metadata: Metadata = {
  title: "Email preferences · Taylored Instruction",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <UnsubscribePage />
    </Suspense>
  );
}
