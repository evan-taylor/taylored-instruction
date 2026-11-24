import type { Metadata } from "next";
import { Suspense } from "react";
import { AlignedAdmin } from "@/components/admin/aligned";

export const metadata: Metadata = {
  title: "Aligned instructors · Admin · Taylored Instruction",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <AlignedAdmin />
    </Suspense>
  );
}
