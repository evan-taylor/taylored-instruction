import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const { priceId, email, quantity, metadata } = await req.json();
  
  if (!priceId || !email || !quantity) {
    return NextResponse.json(
      { error: 'Missing priceId, email, or quantity in request body' },
      { status: 400 }
    );
  }

  const numQuantity = Number(quantity);
  if (isNaN(numQuantity) || numQuantity < 1 || numQuantity > 100) {
    return NextResponse.json(
      { error: 'Invalid quantity. Must be between 1 and 100.' },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/ecards?canceled=true`,
      customer_email: email,
      line_items: [{ 
        price: priceId, 
        quantity: numQuantity 
      }],
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
    } else {
      console.error('Stripe session created, but no URL was returned.', session);
      return NextResponse.json(
        { error: 'Checkout session created, but no redirect URL was provided.' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    const errorMessage = err.raw?.message || err.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}