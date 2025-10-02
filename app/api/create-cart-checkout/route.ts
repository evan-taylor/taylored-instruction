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
  const { lineItems, email, metadata } = await req.json();

  const MIN_ITEM_QUANTITY = 1;
  const MAX_ITEM_QUANTITY = 100;

  const validateItems = (items: Array<{ price?: string; quantity?: number }>) => {
    for (const item of items) {
      if (!item.price || !item.quantity || item.quantity < MIN_ITEM_QUANTITY) {
        return "Each line item must have a valid price ID and quantity";
      }
      if (item.quantity > MAX_ITEM_QUANTITY) {
        return `Quantity for any item cannot exceed ${MAX_ITEM_QUANTITY}`;
      }
    }
    return null;
  };

  const validateRequest = () => {
    const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;
    if (!hasLineItems) return "Missing or invalid lineItems in request body";
    if (!email) return "Missing email in request body";
    return validateItems(lineItems as Array<{ price?: string; quantity?: number }>);
  };

  const validationError = validateRequest();
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
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
      line_items: lineItems,
      metadata,
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
