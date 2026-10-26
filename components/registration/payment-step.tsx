"use client";
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { useAction, useMutation } from "convex/react";
import { Clock, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { trackRegistration } from "@/lib/registration-analytics";
import { getStripe } from "@/lib/stripe-client";
import { cn } from "@/lib/utils";
import { CHECKOUT_HOLD_MINUTES } from "@/shared/registration/domain";
import { errorText } from "./errors";

/** Elements render inside Stripe iframes, so the site font is loaded by URL. */
const ELEMENT_FONTS = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=swap",
  },
];
const APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#21538a",
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    colorDanger: "#be123c",
    fontFamily: '"Readex Pro", ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: "16px",
    borderRadius: "6px",
  },
  rules: {
    ".Input": { borderColor: "#cbd5e1", boxShadow: "none" },
    ".Input:focus": {
      borderColor: "#21538a",
      boxShadow: "0 0 0 2px rgba(33, 83, 138, 0.3)",
    },
    ".Label": { fontWeight: "500", color: "#334155" },
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
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm",
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

function PaymentForm({
  expired,
  orderId,
  onPaying,
}: {
  expired: boolean;
  orderId: string;
  /** Fires before Stripe takes over so leaving the page is not read as abandoning. */
  onPaying: (paying: boolean) => void;
}) {
  const state = useCheckoutElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reportedState = useRef("");
  useEffect(() => {
    if (state.type === "loading" || reportedState.current === state.type) {
      return;
    }
    reportedState.current = state.type;
    trackRegistration(
      state.type === "error"
        ? "registration_payment_form_failed"
        : "registration_payment_form_ready",
      { order_id: orderId }
    );
  }, [state.type, orderId]);
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
    onPaying(true);
    trackRegistration("registration_payment_submitted", {
      order_id: orderId,
      total_cents: checkout.total.total.minorUnitsAmount,
      tax_cents: tax,
    });
    try {
      const result = await checkout.confirm();
      if (result.type === "error") {
        trackRegistration("registration_payment_failed", {
          order_id: orderId,
          error_stage: "confirmation",
        });
        setMessage(result.error.message);
        setBusy(false);
        onPaying(false);
      } else {
        trackRegistration("registration_payment_returned", {
          order_id: orderId,
        });
      }
    } catch {
      trackRegistration("registration_payment_failed", {
        order_id: orderId,
        error_stage: "network",
      });
      setMessage(
        "Unable to confirm payment. Check your connection and try again."
      );
      setBusy(false);
      onPaying(false);
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
      <fieldset className="min-w-0 space-y-2 border-0 p-0" disabled={busy}>
        <legend className="mb-2 font-semibold text-slate-900">
          Billing address
        </legend>
        <p className="text-slate-500 text-sm">
          Sales tax is calculated from this address.
        </p>
        <BillingAddressElement
          onChange={(event) => {
            if (event.complete) {
              trackRegistration("registration_billing_completed", {
                order_id: orderId,
              });
            }
          }}
        />
      </fieldset>
      <fieldset className="min-w-0 space-y-2 border-0 p-0" disabled={busy}>
        <legend className="mb-2 font-semibold text-slate-900">Payment</legend>
        <PaymentElement
          onChange={(event) => {
            if (event.complete) {
              trackRegistration("registration_payment_details_completed", {
                order_id: orderId,
              });
            }
          }}
        />
      </fieldset>
      <dl className="space-y-1.5 border-slate-200 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{checkout.total.subtotal.amount}</dd>
        </div>
        {checkout.total.discount.minorUnitsAmount > 0 ? (
          <div className="flex items-center justify-between gap-3 text-emerald-700">
            <dt>Discount</dt>
            <dd className="tabular-nums">− {checkout.total.discount.amount}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Sales tax</dt>
          <dd className="tabular-nums">
            {tax > 0 ? checkout.total.taxExclusive.amount : "Enter address"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <dt className="font-semibold text-slate-900">Total due today</dt>
          <dd className="font-bold text-slate-900 text-xl tabular-nums">
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
      <p className="flex items-start gap-1.5 text-slate-500 text-xs">
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
  releaseOnLeave = false,
}: {
  orderId: Id<"registrationOrders">;
  requestKey: string;
  expires: number;
  onStartOver: () => void;
  /**
   * Give the seats back as soon as the purchaser leaves without paying,
   * instead of holding them for the full window. Only for self-serve
   * checkouts: a staff payment request must survive the student closing the tab.
   */
  releaseOnLeave?: boolean;
}) {
  const checkout = useAction(api.registrationExternal.checkout);
  const abandon = useMutation(api.registration.abandon);
  const [secret, setSecret] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const released = useRef(false);
  const unmountRelease = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!releaseOnLeave) {
      return;
    }
    // A beacon survives the tab closing; the mutation is a no-op once the
    // order is anything other than a live hold, so a late or duplicate
    // release can never undo a payment.
    const leave = () => {
      if (payingRef.current || released.current) {
        return;
      }
      released.current = true;
      trackRegistration("registration_checkout_left", { order_id: orderId });
      navigator.sendBeacon(
        "/api/registration/abandon",
        JSON.stringify({ orderId, requestKey })
      );
    };
    // StrictMode replays unmount and mount on the same instance in
    // development. Deferring the unmount release lets that immediate
    // remount cancel it, so only a real unmount gives the seats back.
    if (unmountRelease.current) {
      clearTimeout(unmountRelease.current);
      unmountRelease.current = null;
    }
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      // Client-side navigation and "start again" unmount the step instead.
      unmountRelease.current = setTimeout(leave, 250);
    };
  }, [releaseOnLeave, orderId, requestKey]);
  const cancel = async () => {
    if (payingRef.current || released.current) {
      return;
    }
    released.current = true;
    try {
      await abandon({ orderId, requestKey });
      trackRegistration("registration_checkout_canceled", {
        order_id: orderId,
      });
    } catch {
      // The hold still lapses on its own; the purchaser is leaving either way.
    }
    onStartOver();
  };
  useEffect(() => {
    let cancelled = false;
    trackRegistration("registration_checkout_started", {
      order_id: orderId,
      attempt,
    });
    checkout({ orderId, requestKey })
      .then((value) => {
        if (!cancelled) {
          trackRegistration("registration_checkout_ready", {
            order_id: orderId,
          });
          setSecret(value);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          trackRegistration("registration_checkout_failed", {
            order_id: orderId,
            error_stage: "checkout",
          });
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
  }, [checkout, orderId, requestKey, attempt]);
  const expired = expires <= now;
  const expiryReported = useRef(false);
  useEffect(() => {
    if (expired && !expiryReported.current) {
      expiryReported.current = true;
      trackRegistration("registration_hold_expired", { order_id: orderId });
    }
  }, [expired, orderId]);
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
          <h2 className="font-semibold text-slate-900 text-xl">Payment</h2>
          <p className="mt-0.5 text-slate-500 text-sm">
            Your seats are reserved while you enter payment details.
          </p>
        </div>
        <HoldTimer expires={expires} now={now} />
      </div>
      {expired ? (
        <Notice tone="warning">
          <p className="font-medium">Your reservation has expired.</p>
          <p className="mt-1">
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
              onClick={() => {
                // Same order and request key, so the held seats are reused.
                setFailure("");
                trackRegistration("registration_checkout_retried", {
                  order_id: orderId,
                  attempt: attempt + 1,
                });
                setAttempt((n) => n + 1);
              }}
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
            elementsOptions: { appearance: APPEARANCE, fonts: ELEMENT_FONTS },
          }}
          stripe={getStripe()}
        >
          <PaymentForm
            expired={expired}
            onPaying={(value) => {
              payingRef.current = value;
              setPaying(value);
            }}
            orderId={orderId}
          />
        </CheckoutElementsProvider>
      ) : null}
      {releaseOnLeave && !expired ? (
        <p className="text-center text-slate-500 text-sm">
          Changed your mind?{" "}
          <button
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            disabled={paying}
            onClick={cancel}
            type="button"
          >
            Cancel and release my seats
          </button>
        </p>
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
