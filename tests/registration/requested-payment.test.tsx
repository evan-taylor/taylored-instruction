import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { RequestedPayment } from "../../components/registration/requested-payment";

const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  click: null as (() => Promise<void>) | null,
  paymentProps: null as Record<string, unknown> | null,
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrationPayments: { beginRequestedPayment: {} },
    registrationPortal: { review: {} },
  },
}));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.begin,
  useQuery: () => undefined,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams({ order: "current-order", key: "current-key" }),
}));
vi.mock("@/components/ui/Button", () => ({
  Button: ({ onClick }: { onClick: () => Promise<void> }) => {
    mocks.click = onClick;
    return null;
  },
}));
vi.mock("../../components/registration/payment-step", () => ({
  PaymentStep: (props: Record<string, unknown>) => {
    mocks.paymentProps = props;
    return null;
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  mocks.paymentProps = null;
});

it("replaces a stale checkout order before opening the emailed payment form", async () => {
  let saved = JSON.stringify({ orderId: "old-order", requestKey: "old-key" });
  const setItem = vi.fn((_key: string, value: string) => {
    saved = value;
  });
  vi.stubGlobal("sessionStorage", { setItem });
  mocks.begin.mockResolvedValue({ expires: Date.now() + 900_000 });
  renderToStaticMarkup(<RequestedPayment />);
  if (!mocks.click) {
    throw new Error("Missing continue button");
  }
  await mocks.click();
  expect(mocks.begin).toHaveBeenCalledWith({
    orderId: "current-order",
    requestKey: "current-key",
  });
  expect(setItem).toHaveBeenCalledWith(
    "registration-order",
    expect.any(String)
  );
  expect(JSON.parse(saved)).toEqual({
    orderId: "current-order",
    requestKey: "current-key",
  });
});
