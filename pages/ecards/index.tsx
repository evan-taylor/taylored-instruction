import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { useProfile } from '../../hooks/useProfile';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import { FaShoppingCart } from 'react-icons/fa';

const supabase = createClient();

// Product interface should match your Supabase schema (excluding price)
interface Product {
  id: string; // Supabase product ID
  name: string;
  description: string | null;
  // price: number; // Removed, will fetch from Stripe
  stripe_price_id: string; // Crucial: Stripe Price ID
  image_urls: string | null;
  type: string;
  requires_instructor: boolean;
}

// Enriched product type for display, including Stripe price info
interface ProductWithPrice extends Product {
  display_price: number; // Price in the major currency unit (e.g., dollars)
  currency: string;
  // Potentially other Stripe product details if fetched and needed
  stripe_product_name?: string;
  stripe_product_description?: string | null;
}

const ECardsPage: NextPage = () => {
  const router = useRouter();
  const { isInstructor, loading, session } = useProfile();
  // Products state will now hold ProductWithPrice
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state for Supabase & Stripe data
  const [error, setError] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  // Effect for handling redirection
  useEffect(() => {
    if (loading) return; // Wait for useProfile to finish loading

    if (!session) {
      router.push('/login');
    } else if (!isInstructor) {
      router.push('/my-account');
    }
    // If session && isInstructor, do nothing, allow page to render and fetch data.
  }, [loading, session, isInstructor, router]);

  // Fetch eCard products only if authorized and auth check is complete
  useEffect(() => {
    const fetchECardsAndPrices = async () => {
      if (!session || !session.user || !isInstructor) {
        setIsLoading(false);
        setProducts([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch basic product data (including stripe_price_id) from Supabase
        const { data: supabaseProducts, error: fetchError } = await supabase
          .from('products')
          .select('id, name, description, stripe_price_id, image_urls, type, requires_instructor') // Ensure stripe_price_id is selected
          .eq('type', 'ecard');

        if (fetchError) {
          console.error('fetchECardsAndPrices: Error fetching Supabase data:', fetchError);
          throw fetchError;
        }
        if (!supabaseProducts || supabaseProducts.length === 0) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        // 2. Extract Stripe Price IDs
        const priceIds = supabaseProducts.map(p => p.stripe_price_id).filter(id => id != null) as string[];
        if (priceIds.length === 0) {
          // Set products without price info, or handle as error - for now, show them without prices
          // Or, more strictly, consider it an error if price IDs are expected but missing.
          setProducts(supabaseProducts.map(p => ({ ...p, display_price: 0, currency: 'USD' }))); // Fallback, ideally handle better
          setIsLoading(false);
          return;
        }

        // 3. Fetch price details from our new API route
        const priceResponse = await fetch('/api/get-stripe-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceIds }),
        });

        if (!priceResponse.ok) {
          const errorData = await priceResponse.json();
          throw new Error(errorData.error || 'Failed to fetch Stripe prices.');
        }

        const stripePriceDataArray = await priceResponse.json();

        // 4. Merge Supabase product data with Stripe price data
        const enrichedProducts = supabaseProducts.map((supaProduct) => {
          const stripeInfo = stripePriceDataArray.find((sp: any) => sp.id === supaProduct.stripe_price_id && !sp.error);
          if (stripeInfo && stripeInfo.unit_amount !== null) {
            return {
              ...supaProduct,
              display_price: stripeInfo.unit_amount / 100, // Convert cents to dollars/major unit
              currency: stripeInfo.currency.toUpperCase(),
              stripe_product_name: stripeInfo.product_name, // from expanded product
              stripe_product_description: stripeInfo.product_description // from expanded product
            };
          } else {
            console.warn(`Stripe price info not found or invalid for ${supaProduct.stripe_price_id}. Product: ${supaProduct.name}`);
            // Fallback for products where Stripe price couldn't be fetched
            return {
              ...supaProduct,
              display_price: 0, // Or some other indicator like -1 or NaN
              currency: 'N/A',
              // You might want to filter these out or display an error message for them
            };
          }
        });

        setProducts(enrichedProducts);

      } catch (err: any) {
        console.error('fetchECardsAndPrices: Error in fetchECardsAndPrices function:', err);
        setError(err.message || 'Failed to fetch eCards and their prices. Please try again.');
        setProducts([]); // Clear products on error
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading && session && isInstructor) {
      fetchECardsAndPrices();
    } else if (!loading && (!session || !isInstructor)) {
      setIsLoading(false);
      setProducts([]);
    }
  }, [loading, session, isInstructor, supabase]); // supabase client as dependency

  // Helper function to get the image URL or a placeholder
  const getImageUrl = (imageUrl: string | null): string => {
    if (!imageUrl || imageUrl.trim() === '') {
      return '/placeholder-image.jpg'; // Placeholder image if none available
    }
    // Ensure the path starts with a slash if it's a relative path
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [productId]: quantity,
    }));
  };

  const handlePurchase = async (product: ProductWithPrice) => {
    const quantity = selectedQuantities[product.id] || 1;
    if (quantity < 1) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: product.stripe_price_id,
          email: session?.user?.email,
          quantity,
          metadata: { 
            productName: product.stripe_product_name || product.name,
            description: product.stripe_product_description || product.description,
            imageUrl: getImageUrl(product.image_urls),
            userId: session?.user?.id,
            supabaseProductId: product.id
          }
        }),
      });

      const data = await response.json();
      // The backend returns `sessionId`, and Stripe redirects via `session.url`
      // Let's make sure the backend actually sends the `url` from the Stripe session object
      if (data.url) { // Stripe session object has a `url` property
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback or if you decide to use Stripe.js to redirect on client
        // For now, log an error if URL is missing, as backend should provide it.
        console.error('Checkout session created, but no redirect URL was provided.', data);
        setError('Could not redirect to checkout. Please try again.');
      } else {
        console.error('Error creating checkout session:', data.error || 'Unknown error');
        setError(data.error || 'Could not initiate checkout. Please try again.');
      }
    } catch (err) {
      console.error('Error in purchase flow', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Show loading UI:
  // 1. While useProfile is loading.
  // 2. Or, if useProfile is done, but products are still loading (isLoading is true).
  if (loading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            {/* Be more specific about what's loading */}
            <p className="text-lg">{loading ? "Checking access..." : "Loading eCards..."}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // After all loading (auth and products), if conditions for access are still not met
  // (e.g., client-side change or race condition, though useEffect should handle redirect).
  // This is primarily for clear UI before redirect fully kicks in from useEffect.
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-600">Access Denied. You must be logged in.</p>
            <Link href="/login" className="mt-4 inline-block btn btn-primary">
              Login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-600">Access Denied. You must be an approved instructor.</p>
            <Link href="/my-account" className="mt-4 inline-block btn btn-primary">
              Go to My Account
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">eCards</h1>
          <p className="text-gray-600 mb-8">
            Purchase eCards for your certification courses. As an approved instructor, you can distribute these to your students upon completion of your training courses.
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {products.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <p className="text-lg">No eCard products are currently available.</p>
              <p className="mt-2 text-gray-600">Please check back soon or contact support for assistance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={getImageUrl(product.image_urls)}
                      alt={product.stripe_product_name || product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold mb-2">{product.stripe_product_name || product.name}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-2">{product.stripe_product_description || product.description}</p>
                    
                    {/* This new div will group quantity, price, and button, and be pushed to the bottom */}
                    <div className="mt-auto pt-4"> {/* pt-4 to add some space above the quantity if title/desc is short */}
                      <div className="flex items-center mb-4">
                        <label htmlFor={`quantity-${product.id}`} className="mr-2">Quantity:</label>
                        <input
                          id={`quantity-${product.id}`}
                          type="number"
                          min={1}
                          value={selectedQuantities[product.id] || 1}
                          onChange={e => handleQuantityChange(product.id, parseInt(e.target.value, 10))}
                          className="border rounded w-16 p-1"
                        />
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-bold text-primary">
                          {product.display_price > 0 ? `$${product.display_price.toFixed(2)} ${product.currency}` : 'Price unavailable'}
                        </span>
                        <button
                          onClick={() => handlePurchase(product)}
                          disabled={checkoutLoading || product.display_price <= 0}
                          className="btn btn-primary inline-flex items-center"
                        >
                          <FaShoppingCart className="mr-2" />
                          {checkoutLoading ? 'Processing...' : 'Purchase'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ECardsPage; 