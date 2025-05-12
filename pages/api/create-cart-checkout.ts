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

  const { lineItems, email, metadata } = req.body;

  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0 || !email) {
    res.status(400).json({ error: 'Missing or invalid lineItems or email in request body' });
    return;
  }

  // Validate line items
  for (const item of lineItems) {
    if (!item.price || !item.quantity || item.quantity < 1) {
      res.status(400).json({ error: 'Each line item must have a valid price ID and quantity' });
      return;
    }
    if (item.quantity > 100) {
      res.status(400).json({ error: 'Quantity for any item cannot exceed 100' });
      return;
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
      res.status(200).json({ url: session.url });
    } else {
      console.error('Stripe session created, but no URL was returned.', session);
      res.status(500).json({ error: 'Checkout session created, but no redirect URL was provided.' });
    }
  } catch (err: any) {
    console.error('Error creating Stripe cart checkout session:', err);
    const errorMessage = err.raw?.message || err.message || 'Internal Server Error';
    res.status(500).json({ error: errorMessage });
  }
} 