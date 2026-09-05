import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import PostHogClient from "@/lib/posthog";

// Lazy Stripe initialization to avoid build-time errors
function getStripeClient(): Stripe {
  const StripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!StripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(StripeSecretKey, {
    apiVersion: "2026-08-26.dahlia",
  });
}

export async function POST(req: NextRequest) {
  const { priceId, email, quantity, metadata } = await req.json();

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
    // Track checkout session creation
    const posthog = PostHogClient();
    await posthog?.capture({
      distinctId: email,
      event: "checkout_session_created",
      properties: {
        email,
        metadata,
        priceId,
        quantity: numQuantity,
      },
    });

    // Stripe API parameters use snake_case as required by their API
    const session = await getStripeClient().checkout.sessions.create({
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
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
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards/success?session_id={CHECKOUT_SESSION_ID}`,
      tax_id_collection: {
        enabled: true,
      },
    });

    if (session.url) {
      // Track successful checkout session creation
      await posthog?.capture({
        distinctId: email,
        event: "checkout_session_created_success",
        properties: {
          email,
          metadata,
          priceId,
          quantity: numQuantity,
          sessionId: session.id,
        },
      });
      await posthog?.shutdown();

      return NextResponse.json({ url: session.url });
    }

    await posthog?.shutdown();
    return NextResponse.json(
      { error: "Checkout session created, but no redirect URL was provided." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);

    // Track checkout session creation error
    const posthog = PostHogClient();
    await posthog?.capture({
      distinctId: email,
      event: "checkout_session_error",
      properties: {
        email,
        error: errorMessage,
        priceId,
        quantity: numQuantity,
      },
    });
    await posthog?.shutdown();

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
