import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { priceId, email, quantity, metadata } = req.body;
  if (!priceId || !email || !quantity) {
    res.status(400).json({ error: 'Missing priceId, email, or quantity in request body' });
    return;
  }

  const numQuantity = Number(quantity);
  if (isNaN(numQuantity) || numQuantity < 1 || numQuantity > 100) {
    res.status(400).json({ error: 'Invalid quantity. Must be between 1 and 100.' });
    return;
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
      allow_promotion_codes: true,
    });

    if (session.url) {
      res.status(200).json({ url: session.url });
    } else {
      console.error('Stripe session created, but no URL was returned.', session);
      res.status(500).json({ error: 'Checkout session created, but no redirect URL was provided.' });
    }
  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    const errorMessage = err.raw?.message || err.message || 'Internal Server Error';
    res.status(500).json({ error: errorMessage });
  }
} 