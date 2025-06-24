'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "../../hooks/useProfile";
import { createClient } from "../../utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";

const supabase = createClient();

interface Product {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string;
  image_urls: string | null;
  type: string;
  requires_instructor: boolean;
}

interface ProductWithPrice extends Product {
  display_price: number;
  currency: string;
  stripe_product_name?: string;
  stripe_product_description?: string | null;
}

interface CartItem {
  product: ProductWithPrice;
  quantity: number;
}

export default function ECardsPage() {
  const router = useRouter();
  const { isInstructor, loading, session } = useProfile();
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [loadingProductIds, setLoadingProductIds] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("ecardsCart");
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          console.error("Failed to parse cart from localStorage", e);
        }
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (cartItems.length > 0) {
        localStorage.setItem("ecardsCart", JSON.stringify(cartItems));
      } else {
        localStorage.removeItem("ecardsCart");
      }
    }
  }, [cartItems]);

  // Effect for handling redirection
  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.push("/login");
    } else if (!isInstructor) {
      router.push("/my-account");
    }
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
        const { data: supabaseProducts, error: fetchError } = await supabase
          .from("products")
          .select(
            "id, name, description, stripe_price_id, image_urls, type, requires_instructor"
          )
          .eq("type", "ecard");

        if (fetchError) {
          console.error(
            "fetchECardsAndPrices: Error fetching Supabase data:",
            fetchError
          );
          throw fetchError;
        }
        if (!supabaseProducts || supabaseProducts.length === 0) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        const priceIds = supabaseProducts
          .map((p) => p.stripe_price_id)
          .filter((id) => id != null) as string[];
        if (priceIds.length === 0) {
          setProducts(
            supabaseProducts.map((p) => ({
              ...p,
              display_price: 0,
              currency: "USD",
            }))
          );
          setIsLoading(false);
          return;
        }

        const priceResponse = await fetch("/api/get-stripe-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceIds }),
        });

        if (!priceResponse.ok) {
          const errorData = await priceResponse.json();
          throw new Error(errorData.error || "Failed to fetch Stripe prices.");
        }

        const stripePriceDataArray = await priceResponse.json();

        const enrichedProducts = supabaseProducts.map((supaProduct) => {
          const stripeInfo = stripePriceDataArray.find(
            (sp: any) => sp.id === supaProduct.stripe_price_id && !sp.error
          );
          if (stripeInfo && stripeInfo.unit_amount !== null) {
            return {
              ...supaProduct,
              display_price: stripeInfo.unit_amount / 100,
              currency: stripeInfo.currency.toUpperCase(),
              stripe_product_name: stripeInfo.product_name,
              stripe_product_description: stripeInfo.product_description,
            };
          } else {
            return {
              ...supaProduct,
              display_price: 0,
              currency: "N/A",
            };
          }
        });

        setProducts(enrichedProducts);
      } catch (err: any) {
        console.error(
          "fetchECardsAndPrices: Error in fetchECardsAndPrices function:",
          err
        );
        setError(
          err.message ||
            "Failed to fetch eCards and their prices. Please try again."
        );
        setProducts([]);
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
  }, [loading, session, isInstructor]);

  const getImageUrl = (imageUrl: string | null): string => {
    if (!imageUrl || imageUrl.trim() === "") {
      return "/placeholder-image.jpg";
    }
    return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: quantity,
    }));
  };

  const addToCart = (product: ProductWithPrice) => {
    const quantity = selectedQuantities[product.id] || 1;
    if (quantity < 1) return;

    const existingItemIndex = cartItems.findIndex(
      (item) => item.product.id === product.id
    );

    if (existingItemIndex >= 0) {
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += quantity;
      setCartItems(updatedCart);
    } else {
      setCartItems([...cartItems, { product, quantity }]);
    }

    setSelectedQuantities((prev) => ({
      ...prev,
      [product.id]: 1,
    }));

    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.product.id !== productId));
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setCartItems(
      cartItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecardsCart");
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.product.display_price * item.quantity,
      0
    );
  };

  const handleCartCheckout = async () => {
    if (cartItems.length === 0) return;

    try {
      const lineItems = cartItems.map((item) => ({
        price: item.product.stripe_price_id,
        quantity: item.quantity,
      }));

      setLoadingProductIds(cartItems.map((item) => item.product.id));

      const response = await fetch("/api/create-cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          lineItems,
          metadata: {
            userId: session?.user?.id,
            cartItems: JSON.stringify(
              cartItems.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
              }))
            ),
          },
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(
          "Error creating checkout session:",
          data.error || "Unknown error"
        );
        setError(
          data.error || "Could not initiate checkout. Please try again."
        );
      }
    } catch (err) {
      console.error("Error in cart checkout flow", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingProductIds([]);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">
            {loading ? "Checking access..." : "Loading eCards..."}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">
            Access Denied. You must be logged in.
          </p>
          <Link href="/login" className="mt-4 inline-block btn btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">
            Access Denied. You must be an approved instructor.
          </p>
          <Link
            href="/my-account"
            className="mt-4 inline-block btn btn-primary"
          >
            Go to My Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Shopping Cart Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="relative flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
        >
          <ShoppingCart className="mr-2" />
          <span>
            Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
          </span>
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Shopping Cart Dropdown */}
      {isCartOpen && (
        <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-white border-l border-gray-200 shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Cart</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <ShoppingCart size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex border rounded-lg p-3 shadow-sm"
                  >
                    <div className="w-16 h-16 overflow-hidden rounded mr-3 flex-shrink-0">
                      <Image
                        src={getImageUrl(item.product.image_urls)}
                        alt={item.product.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">
                        ${item.product.display_price.toFixed(2)} each
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded">
                          <button
                            onClick={() =>
                              updateCartItemQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateCartItemQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-500 hover:underline mb-4 inline-block"
              >
                Clear Cart
              </button>
            )}

            <div className="flex justify-between font-semibold mb-4">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>

            <button
              onClick={handleCartCheckout}
              disabled={
                cartItems.length === 0 || loadingProductIds.length > 0
              }
              className="w-full bg-primary text-white px-4 py-3 rounded-lg shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
            >
              {loadingProductIds.length > 0
                ? "Processing..."
                : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8 text-center">eCards</h1>

      {error && <p className="text-red-600 text-center mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col h-full"
          >
            <div className="h-48 overflow-hidden">
              <Image
                src={getImageUrl(product.image_urls)}
                alt={product.stripe_product_name || product.name}
                width={300}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {product.description}
              </p>
              <div className="text-lg font-semibold text-primary mt-auto">
                ${product.display_price.toFixed(2)} each
              </div>
            </div>

            <div className="p-4 pt-0 border-t mt-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded overflow-hidden">
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        product.id,
                        Math.max(1, (selectedQuantities[product.id] || 1) - 1)
                      )
                    }
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <Minus size={10} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={selectedQuantities[product.id] || 1}
                    onChange={(e) =>
                      handleQuantityChange(
                        product.id,
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-12 border-0 py-1 text-center focus:ring-0"
                  />
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        product.id,
                        (selectedQuantities[product.id] || 1) + 1
                      )
                    }
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center justify-center"
                >
                  <ShoppingCart className="mr-2" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}