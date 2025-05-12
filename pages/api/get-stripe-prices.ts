import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Ensure STRIPE_SECRET_KEY is set in your environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface PriceInfo {
  id: string; // Stripe Price ID
  unit_amount: number | null; // Price in cents
  currency: string;
  product_id: string | Stripe.Product | null; // Stripe Product ID
  product_name?: string; // We'll try to fetch this
  product_description?: string | null; // We'll try to fetch this
  product_images?: string[]; // We'll try to fetch this
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { priceIds } = req.body;

  if (!Array.isArray(priceIds) || priceIds.some(id => typeof id !== 'string')) {
    res.status(400).json({ error: 'Invalid input: priceIds must be an array of strings.' });
    return;
  }

  if (priceIds.length === 0) {
    res.status(200).json([]); // Return empty if no IDs are provided
    return;
  }

  try {
    const priceDetailsPromises = priceIds.map(async (id) => {
      try {
        const price = await stripe.prices.retrieve(id, { expand: ['product'] });
        let productName, productDescription, productImages;

        // Check if product is expanded and is a Stripe.Product object (not just an ID string)
        if (price.product && typeof price.product === 'object' && 'name' in price.product) {
          const productData = price.product as Stripe.Product;
          productName = productData.name;
          productDescription = productData.description;
          productImages = productData.images;
        }
        
        return {
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          product_id: price.product, // This could be an ID string or an expanded Product object
          // Include product details if available from expansion
          product_name: productName, 
          product_description: productDescription,
          product_images: productImages
        };
      } catch (error) {
        console.warn(`Failed to retrieve price ${id}:`, error);
        // Return null or a specific error structure for individual price fetch failures
        // This allows other prices to still be processed if one fails.
        return { id, error: 'Failed to retrieve price details.' };
      }
    });

    const results = await Promise.all(priceDetailsPromises);
    
    // Filter out any nulls if you chose to return null on individual errors
    // Or handle errors as needed. For now, we return all results including errors.
    res.status(200).json(results);

  } catch (err: any) {
    console.error('Error fetching Stripe prices:', err);
    res.status(500).json({ error: 'Internal Server Error while fetching prices.' });
  }
} 