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

// Note: We avoid exporting/using an explicit type alias here to satisfy linter rules

export async function POST(req: NextRequest) {
  const { priceIds } = await req.json();

  if (
    !Array.isArray(priceIds) ||
    priceIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Invalid input: priceIds must be an array of strings." },
      { status: 400 }
    );
  }

  if (priceIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const priceDetailsPromises = priceIds.map(async (id) => {
      try {
        const price = await getStripeClient().prices.retrieve(id, {
          expand: ["product"],
        });
        let productName: string | undefined;
        let productDescription: string | null | undefined;
        let productImages: string[] | undefined;

        if (
          price.product &&
          typeof price.product === "object" &&
          "name" in price.product
        ) {
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
          product_images: productImages,
        };
      } catch (_error) {
        return { id, error: "Failed to retrieve price details." };
      }
    });

    const results = await Promise.all(priceDetailsPromises);
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (_err: unknown) {
    return NextResponse.json(
      { error: "Internal Server Error while fetching prices." },
      { status: 500 }
    );
  }
}
