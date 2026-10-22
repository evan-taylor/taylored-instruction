import { Suspense } from "react";
import { CourseAdmin } from "@/components/admin/courses";
import { Skeleton } from "@/components/ui/page-header";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <CourseAdmin />
    </Suspense>
  );
}
