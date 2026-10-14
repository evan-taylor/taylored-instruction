import { Suspense } from "react";
import { ActivityAdmin } from "@/components/admin/activity";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ActivityAdmin />
    </Suspense>
  );
}
