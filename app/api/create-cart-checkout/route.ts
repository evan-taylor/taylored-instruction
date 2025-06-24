import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const { lineItems, email, metadata } = await req.json();

  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0 || !email) {
    return NextResponse.json(
      { error: 'Missing or invalid lineItems or email in request body' },
      { status: 400 }
    );
  }

  // Validate line items
  for (const item of lineItems) {
    if (!item.price || !item.quantity || item.quantity < 1) {
      return NextResponse.json(
        { error: 'Each line item must have a valid price ID and quantity' },
        { status: 400 }
      );
    }
    if (item.quantity > 100) {
      return NextResponse.json(
        { error: 'Quantity for any item cannot exceed 100' },
        { status: 400 }
      );
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards?canceled=true`,
      customer_email: email,
      line_items: lineItems,
      metadata: metadata,
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
    } else {
      console.error('Stripe session created, but no URL was returned.', session);
      return NextResponse.json(
        { error: 'Checkout session created, but no redirect URL was provided.' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Error creating Stripe cart checkout session:', err);
    const errorMessage = err.raw?.message || err.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}