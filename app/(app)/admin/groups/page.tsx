import { Suspense } from "react";
import { GroupsAdmin } from "@/components/admin/groups";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GroupsAdmin />
    </Suspense>
  );
}
