import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Resend } from 'resend';
import EcardPurchaseAdminEmail from '@/emails/EcardPurchaseAdminEmail';
import EcardPurchaseUserEmail from '@/emails/EcardPurchaseUserEmail';

// Initialize Stripe and Resend
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const resend = new Resend(process.env.RESEND_API_KEY!);

// Configure from and admin email addresses
const fromEmail = process.env.FROM_EMAIL || 'info@tayloredinstruction.com';
const adminEmail = process.env.ADMIN_EMAIL || 'info@tayloredinstruction.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId in request body.' });
  }

  try {
    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Validate that metadata exists and has the required fields
    if (!session.metadata || 
        typeof session.metadata.productName !== 'string' || 
        typeof session.metadata.quantity !== 'string') {
      console.error('Stripe session metadata is missing or invalid. Expected productName and quantity strings:', session.metadata);
      return res.status(400).json({ error: 'Stripe session metadata is missing or invalid. Ensure productName and quantity are present.' });
    }

    // Extract relevant details
    const itemName = session.metadata.productName as string;
    const quantity = session.metadata.quantity as string;
    const customerEmail = session.customer_email;

    if (!customerEmail) {
        // This case should be rare if customer_email is passed to session create
        console.error('Customer email not found in Stripe session or metadata:', session);
        return res.status(400).json({ error: 'Customer email not found in session.' });
    }

    const totalPrice = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00';

    // Send notification email to admin
    const adminEmailData = await resend.emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [adminEmail],
      subject: `New eCard Purchase: ${itemName}`,
      react: EcardPurchaseAdminEmail({
        itemName,
        quantity,
        price: totalPrice,
        customerEmail,
        sessionId
      }),
    });
    if (adminEmailData.error) {
      console.error('Resend Admin Error:', adminEmailData.error);
    }

    // Send confirmation email to the customer
    const userEmailData = await resend.emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [customerEmail],
      subject: 'Your eCard Purchase Confirmation',
      react: EcardPurchaseUserEmail({
        itemName,
        quantity,
        price: totalPrice
      }),
    });
    if (userEmailData.error) {
      console.error('Resend User Error:', userEmailData.error);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in send-ecard-emails API:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
} 