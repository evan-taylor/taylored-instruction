import { Suspense } from "react";
import { OrderAdmin } from "@/components/admin/registrations";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderAdmin />
    </Suspense>
  );
}
