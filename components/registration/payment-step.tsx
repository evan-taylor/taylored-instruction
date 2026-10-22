"use client";
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { useAction } from "convex/react";
import { Clock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getStripe } from "@/lib/stripe-client";
import { cn } from "@/lib/utils";
import { CHECKOUT_HOLD_MINUTES } from "@/shared/registration/domain";
import { errorText } from "./errors";

const APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#21538a",
    colorText: "#0f172a",
    colorDanger: "#be123c",
    fontFamily:
      "var(--font-readex), ui-sans-serif, system-ui, -apple-system, sans-serif",
    borderRadius: "6px",
  },
};
const WARNING_MS = 2 * 60_000;

function remaining(expires: number, now: number) {
  const seconds = Math.max(0, Math.floor((expires - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Visible reservation timer; the hold is short now that payment is on-page. */
export function HoldTimer({
  expires,
  now,
  className,
}: {
  expires: number;
  now: number;
  className?: string;
}) {
  const left = expires - now;
  const urgent = left <= WARNING_MS;
  return (
    <p
      aria-live={urgent ? "polite" : "off"}
      className={cn(
        "m-0 inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm",
        urgent ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700",
        className
      )}
    >
      <Clock aria-hidden="true" className="h-4 w-4" />
      <span>
        Seats held for{" "}
        <span className="tabular-nums">{remaining(expires, now)}</span>
      </span>
    </p>
  );
}

function PaymentForm({ expired }: { expired: boolean }) {
  const state = useCheckoutElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (state.type === "loading") {
    return (
      <div aria-busy="true" className="space-y-4" role="status">
        <span className="sr-only">Loading the payment form…</span>
        <Skeleton className="h-28" />
        <Skeleton className="h-44" />
        <Skeleton className="h-11" />
      </div>
    );
  }
  if (state.type === "error") {
    return (
      <Notice tone="danger">
        The payment form couldn’t load: {state.error.message}
      </Notice>
    );
  }
  const { checkout } = state;
  const tax = checkout.total.taxExclusive.minorUnitsAmount;
  const confirm = async () => {
    setBusy(true);
    setMessage("");
    const result = await checkout.confirm();
    // On success Stripe sends the customer to the return URL; only an
    // immediate failure lands here.
    if (result.type === "error") {
      setMessage(result.error.message);
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        confirm();
      }}
    >
      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0" disabled={busy}>
        <legend className="mb-2 font-semibold text-slate-900">
          Billing address
        </legend>
        <p className="m-0 text-slate-500 text-sm">
          Sales tax is calculated from this address.
        </p>
        <BillingAddressElement />
      </fieldset>
      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0" disabled={busy}>
        <legend className="mb-2 font-semibold text-slate-900">Payment</legend>
        <PaymentElement />
      </fieldset>
      <dl className="m-0 space-y-1.5 border-slate-200 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Subtotal</dt>
          <dd className="m-0 tabular-nums">{checkout.total.subtotal.amount}</dd>
        </div>
        {checkout.total.discount.minorUnitsAmount > 0 ? (
          <div className="flex items-center justify-between gap-3 text-emerald-700">
            <dt>Discount</dt>
            <dd className="m-0 tabular-nums">
              − {checkout.total.discount.amount}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Sales tax</dt>
          <dd className="m-0 tabular-nums">
            {tax > 0 ? checkout.total.taxExclusive.amount : "Enter address"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <dt className="font-semibold text-slate-900">Total due today</dt>
          <dd className="m-0 font-bold text-slate-900 text-xl tabular-nums">
            {checkout.total.total.amount}
          </dd>
        </div>
      </dl>
      {message ? <Notice tone="danger">{message}</Notice> : null}
      <Button
        className="w-full"
        disabled={busy || expired || !checkout.canConfirm}
        type="submit"
      >
        {busy ? "Processing…" : `Pay ${checkout.total.total.amount}`}
      </Button>
      <p className="m-0 flex items-start gap-1.5 text-slate-500 text-xs">
        <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Card details go directly to Stripe and never touch our servers.
      </p>
    </form>
  );
}

/**
 * On-page card payment for a reserved order. Stripe keeps the line items,
 * tax, and settlement webhook; the form itself lives here with a visible
 * reservation timer.
 */
export function PaymentStep({
  orderId,
  requestKey,
  expires,
  onStartOver,
}: {
  orderId: Id<"registrationOrders">;
  requestKey: string;
  expires: number;
  onStartOver: () => void;
}) {
  const checkout = useAction(api.registrationExternal.checkout);
  const [secret, setSecret] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    checkout({ orderId, requestKey })
      .then((value) => {
        if (!cancelled) {
          setSecret(value);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFailure(
            errorText(
              error,
              "Unable to open the payment form. Please try again."
            )
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [checkout, orderId, requestKey]);
  const expired = expires <= now;
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Notice tone="danger">
        Card payment isn’t configured for this site yet. Nothing was charged;
        please contact us to complete your registration.
      </Notice>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-semibold text-slate-900 text-xl">Payment</h2>
          <p className="m-0 mt-0.5 text-slate-500 text-sm">
            Your seats are reserved while you enter payment details.
          </p>
        </div>
        <HoldTimer expires={expires} now={now} />
      </div>
      {expired ? (
        <Notice tone="warning">
          <p className="m-0 font-medium">Your reservation has expired.</p>
          <p className="m-0 mt-1">
            Nothing was charged. Start again to reserve seats for another{" "}
            {CHECKOUT_HOLD_MINUTES} minutes.
          </p>
          <div className="mt-3">
            <Button onClick={onStartOver} size="sm" type="button">
              Start again
            </Button>
          </div>
        </Notice>
      ) : null}
      {failure ? (
        <Notice tone="danger">
          {failure}
          <div className="mt-3">
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        </Notice>
      ) : null}
      {!(expired || failure) && secret ? (
        <CheckoutElementsProvider
          options={{
            clientSecret: secret,
            elementsOptions: { appearance: APPEARANCE },
          }}
          stripe={getStripe()}
        >
          <PaymentForm expired={expired} />
        </CheckoutElementsProvider>
      ) : null}
      {expired || failure || secret ? null : (
        <div aria-busy="true" className="space-y-4" role="status">
          <span className="sr-only">Preparing secure payment…</span>
          <Skeleton className="h-28" />
          <Skeleton className="h-44" />
        </div>
      )}
    </div>
  );
}
