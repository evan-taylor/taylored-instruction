import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy Stripe initialization to avoid build-time errors
function getStripeClient(): Stripe {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
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
  const MIN_QTY = 1;
  const MAX_QTY = 100;
  if (
    Number.isNaN(numQuantity) ||
    numQuantity < MIN_QTY ||
    numQuantity > MAX_QTY
  ) {
    return NextResponse.json(
      { error: `Invalid quantity. Must be between ${MIN_QTY} and ${MAX_QTY}.` },
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
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
      return NextResponse.json({ url: session.url });
    }
    return NextResponse.json(
      { error: "Checkout session created, but no redirect URL was provided." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
