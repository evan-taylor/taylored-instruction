import { Suspense } from "react";
import { CouponAdmin } from "@/components/admin/coupons";

export default function Page() {
  return (
    <Suspense>
      <CouponAdmin />
    </Suspense>
  );
}
