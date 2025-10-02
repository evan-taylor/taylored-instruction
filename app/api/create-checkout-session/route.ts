import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy Stripe initialization to avoid build-time errors
function getStripeClient(): Stripe {
  const StripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!StripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(StripeSecretKey, {
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
    // Stripe API parameters use snake_case as required by their API
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      // biome-ignore lint/style/useNamingConvention: Stripe API
      payment_method_types: ["card"],
      // biome-ignore lint/style/useNamingConvention: Stripe API
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards/success?session_id={CHECKOUT_SESSION_ID}`,
      // biome-ignore lint/style/useNamingConvention: Stripe API
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards?canceled=true`,
      // biome-ignore lint/style/useNamingConvention: Stripe API
      customer_email: email,
      // biome-ignore lint/style/useNamingConvention: Stripe API
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
      // biome-ignore lint/style/useNamingConvention: Stripe API
      automatic_tax: {
        enabled: true,
      },
      // biome-ignore lint/style/useNamingConvention: Stripe API
      tax_id_collection: {
        enabled: true,
      },
      // biome-ignore lint/style/useNamingConvention: Stripe API
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
