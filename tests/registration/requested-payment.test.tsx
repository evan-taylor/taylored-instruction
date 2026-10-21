import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { RequestedPayment } from "../../components/registration/requested-payment";

const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  checkout: vi.fn(),
  click: null as (() => Promise<void>) | null,
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrationPayments: { beginRequestedPayment: {} },
    registrationExternal: { checkout: {} },
  },
}));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.begin,
  useAction: () => mocks.checkout,
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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it("replaces a stale checkout order before redirecting an emailed payment to Stripe", async () => {
  let saved = JSON.stringify({ orderId: "old-order", requestKey: "old-key" });
  const setItem = vi.fn((_key: string, value: string) => {
    saved = value;
  });
  const assign = vi.fn(() => {
    expect(JSON.parse(saved)).toEqual({
      orderId: "current-order",
      requestKey: "current-key",
    });
  });
  vi.stubGlobal("sessionStorage", { setItem });
  vi.stubGlobal("window", { location: { assign } });
  mocks.begin.mockResolvedValue(null);
  mocks.checkout.mockResolvedValue("https://checkout.stripe.com/test");
  renderToStaticMarkup(<RequestedPayment />);
  if (!mocks.click) {
    throw new Error("Missing checkout button");
  }
  await mocks.click();
  expect(setItem).toHaveBeenCalledWith(
    "registration-order",
    expect.any(String)
  );
  expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/test");
});
