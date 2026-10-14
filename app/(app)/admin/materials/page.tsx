import { Suspense } from "react";
import { MaterialAdmin } from "@/components/admin/materials";

export default function Page() {
  return (
    <Suspense>
      <MaterialAdmin />
    </Suspense>
  );
}
