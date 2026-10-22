import type { Metadata } from "next";
import { RequestedPayment } from "@/components/registration/requested-payment";

export const metadata: Metadata = {
  title: "Complete your payment | Taylored Instruction",
  referrer: "no-referrer",
};

export default function Page() {
  return <RequestedPayment />;
}
