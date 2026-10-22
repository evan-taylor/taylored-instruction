import { Suspense } from "react";
import { SessionAdmin } from "@/components/admin/sessions";
import { Skeleton } from "@/components/ui/page-header";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SessionAdmin />
    </Suspense>
  );
}
