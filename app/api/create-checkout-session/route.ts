import { SeverityNumber } from "@opentelemetry/api-logs";
import { after, type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { flushPostHogLogs, getPostHogLogLogger } from "@/instrumentation";
import PostHogClient from "@/lib/posthog";

// Lazy Stripe initialization to avoid build-time errors
function getStripeClient(): Stripe {
  const StripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!StripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(StripeSecretKey, {
    apiVersion: "2026-09-30.endive",
  });
}

export async function POST(req: NextRequest) {
  const { priceId, email, quantity, metadata } = await req.json();
  const distinctId =
    req.headers.get("x-posthog-distinct-id") ?? crypto.randomUUID();
  const sessionId = req.headers.get("x-posthog-session-id");

  if (!(priceId && email && quantity)) {
    return NextResponse.json(
      { error: "Missing priceId, email, or quantity in request body" },
      { status: 400 }
    );
  }

  const numQuantity = Number(quantity);
  const MinQty = 1;
  const MaxQty = 100;
  if (
    Number.isNaN(numQuantity) ||
    numQuantity < MinQty ||
    numQuantity > MaxQty
  ) {
    return NextResponse.json(
      { error: `Invalid quantity. Must be between ${MinQty} and ${MaxQty}.` },
      { status: 400 }
    );
  }

  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === "object") {
      const obj = err as { raw?: { message?: string }; message?: string };
      return obj.raw?.message ?? (obj.message || "Internal Server Error");
    }
    return "Internal Server Error";
  };

  try {
    const posthogLog = getPostHogLogLogger();
    posthogLog?.emit({
      body: "Ecard checkout session creation started",
      severityNumber: SeverityNumber.INFO,
      attributes: {
        checkout_type: "ecard",
        quantity: numQuantity,
      },
    });

    // Track checkout session creation
    const posthog = PostHogClient();
    await posthog?.capture({
      distinctId,
      event: "checkout_session_created",
      properties: {
        $session_id: sessionId ?? undefined,
        price_id: priceId,
        quantity: numQuantity,
      },
    });

    // Stripe API parameters use snake_case as required by their API
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards?canceled=true`,
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: numQuantity,
        },
      ],
      metadata: {
        ...metadata,
        quantity: numQuantity.toString(),
      },
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      allow_promotion_codes: true,
    });

    if (session.url) {
      // Track successful checkout session creation
      await posthog?.capture({
        distinctId,
        event: "checkout_session_created_success",
        properties: {
          $session_id: sessionId ?? undefined,
          price_id: priceId,
          quantity: numQuantity,
        },
      });
      posthogLog?.emit({
        body: "Ecard checkout session is ready for redirect",
        severityNumber: SeverityNumber.INFO,
        attributes: {
          checkout_type: "ecard",
          quantity: numQuantity,
        },
      });
      after(flushPostHogLogs);
      await posthog?.shutdown().catch(() => {
        /* Analytics must not fail commerce. */
      });

      return NextResponse.json({ url: session.url });
    }

    posthogLog?.emit({
      body: "Ecard checkout session did not provide a redirect URL",
      severityNumber: SeverityNumber.WARN,
      attributes: {
        checkout_type: "ecard",
      },
    });
    after(flushPostHogLogs);
    await posthog?.shutdown().catch(() => {
      /* Analytics must not fail commerce. */
    });
    return NextResponse.json(
      { error: "Checkout session created, but no redirect URL was provided." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    const posthogLog = getPostHogLogLogger();
    posthogLog?.emit({
      body: "Ecard checkout session creation failed",
      severityNumber: SeverityNumber.ERROR,
      attributes: {
        checkout_type: "ecard",
      },
    });
    after(flushPostHogLogs);

    // Track checkout session creation error
    const posthog = PostHogClient();
    await posthog?.capture({
      distinctId,
      event: "checkout_session_error",
      properties: {
        $session_id: sessionId ?? undefined,
        error_type: "checkout_session_creation_failed",
        price_id: priceId,
        quantity: numQuantity,
      },
    });
    await posthog?.shutdown().catch(() => {
      /* Analytics must not fail commerce. */
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
