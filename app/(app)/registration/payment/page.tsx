import type { Metadata } from "next";
import { RequestedPayment } from "@/components/registration/requested-payment";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Complete your payment | Taylored Instruction",
    description:
      "Finish paying for your Taylored Instruction class registration.",
    path: "/registration/payment",
    image: { title: "Complete your payment", eyebrow: "Class registration" },
  }),
  referrer: "no-referrer",
};

export default function Page() {
  return <RequestedPayment />;
}
