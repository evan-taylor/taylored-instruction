import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface PriceInfo {
  id: string;
  unit_amount: number | null;
  currency: string;
  product_id: string | Stripe.Product | null;
  product_name?: string;
  product_description?: string | null;
  product_images?: string[];
}

export async function POST(req: NextRequest) {
  const { priceIds } = await req.json();

  if (!Array.isArray(priceIds) || priceIds.some(id => typeof id !== 'string')) {
    return NextResponse.json(
      { error: 'Invalid input: priceIds must be an array of strings.' },
      { status: 400 }
    );
  }

  if (priceIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const priceDetailsPromises = priceIds.map(async (id) => {
      try {
        const price = await stripe.prices.retrieve(id, { expand: ['product'] });
        let productName, productDescription, productImages;

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
          product_id: price.product,
          product_name: productName, 
          product_description: productDescription,
          product_images: productImages
        };
      } catch (error) {
        console.warn(`Failed to retrieve price ${id}:`, error);
        return { id, error: 'Failed to retrieve price details.' };
      }
    });

    const results = await Promise.all(priceDetailsPromises);
    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Error fetching Stripe prices:', err);
    return NextResponse.json(
      { error: 'Internal Server Error while fetching prices.' },
      { status: 500 }
    );
  }
}