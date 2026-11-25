import { Suspense } from "react";
import { StudentCertificatesAdmin } from "@/components/admin/student-certificates";

export default function Page() {
  return (
    <Suspense>
      <StudentCertificatesAdmin />
    </Suspense>
  );
}
