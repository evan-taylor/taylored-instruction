import { Suspense } from "react";
import { CertificationsAdmin } from "@/components/admin/certifications";

export default function Page() {
  return (
    <Suspense>
      <CertificationsAdmin />
    </Suspense>
  );
}
