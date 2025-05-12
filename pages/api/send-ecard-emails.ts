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

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
}

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
    const customerEmail = session.customer_email;

    if (!customerEmail) {
      // This case should be rare if customer_email is passed to session create
      console.error('Customer email not found in Stripe session or metadata:', session);
      return res.status(400).json({ error: 'Customer email not found in session.' });
    }

    const totalPrice = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00';

    // Determine if this is a cart checkout or a single product checkout
    if (!session.metadata) {
      console.error('Stripe session metadata is missing:', session);
      return res.status(400).json({ error: 'Stripe session metadata is missing.' });
    }

    // Handle cart-based checkout (multiple products)
    if (session.metadata.cartItems) {
      try {
        const cartItems: CartItem[] = JSON.parse(session.metadata.cartItems);
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
          throw new Error('Invalid cart items format');
        }

        // Generate a summary of items for the email
        const itemSummary = cartItems.map(item => 
          `${item.productName} (Qty: ${item.quantity})`
        ).join(', ');

        // Send notification email to admin for cart checkout
        const adminEmailData = await resend.emails.send({
          from: `Taylored Instruction <${fromEmail}>`,
          to: [adminEmail],
          subject: `New Multi-Item eCard Purchase`,
          react: EcardPurchaseAdminEmail({
            itemName: 'Multiple Products',
            quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
            price: totalPrice,
            customerEmail,
            sessionId,
            cartItems: cartItems.map(item => ({
              name: item.productName,
              quantity: item.quantity.toString()
            }))
          }),
        });

        if (adminEmailData.error) {
          console.error('Resend Admin Error:', adminEmailData.error);
        }

        // Send confirmation email to the customer for cart checkout
        const userEmailData = await resend.emails.send({
          from: `Taylored Instruction <${fromEmail}>`,
          to: [customerEmail],
          subject: 'Your eCard Purchase Confirmation',
          react: EcardPurchaseUserEmail({
            itemName: 'Multiple Products',
            quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
            price: totalPrice,
            cartItems: cartItems.map(item => ({
              name: item.productName,
              quantity: item.quantity.toString()
            }))
          }),
        });

        if (userEmailData.error) {
          console.error('Resend User Error:', userEmailData.error);
        }

      } catch (error) {
        console.error('Error processing cart items:', error, session.metadata);
        return res.status(400).json({ error: 'Invalid cart items format.' });
      }
    }
    // Handle single product checkout
    else if (typeof session.metadata.productName === 'string' && 
             typeof session.metadata.quantity === 'string') {
      
      const itemName = session.metadata.productName;
      const quantity = session.metadata.quantity;

      // Send notification email to admin for single product
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

      // Send confirmation email to the customer for single product
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
    } 
    else {
      console.error('Stripe session metadata is invalid format:', session.metadata);
      return res.status(400).json({ error: 'Stripe session metadata has invalid format.' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in send-ecard-emails API:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
} 