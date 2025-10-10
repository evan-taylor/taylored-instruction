"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";

type Product = {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id: string | null;
  image_urls: string | null;
  type: string;
  requires_instructor: boolean;
};

interface ProductWithPrice extends Product {
  display_price: number;
  currency: string;
  stripe_product_name?: string;
  stripe_product_description?: string | null;
}

type CartItem = {
  product: ProductWithPrice;
  quantity: number;
};

export default function ECardsPage() {
  const router = useRouter();
  const posthog = usePostHog();
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
        } catch (_e) {
          setCartItems([]);
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
    if (loading) {
      return;
    }

    if (!session) {
      router.push("/login");
    } else if (!isInstructor) {
      router.push("/my-account");
    }
  }, [loading, session, isInstructor, router]);

  useEffect(() => {
    type StripePriceData = {
      id: string;
      unit_amount: number | null;
      currency: string;
      product_name: string;
      product_description?: string | null;
      error?: string;
    };

    const fetchStripePrices = async (priceIds: string[]) => {
      const priceResponse = await fetch("/api/get-stripe-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceIds }),
      });

      if (!priceResponse.ok) {
        const errorData = await priceResponse.json();
        throw new Error(errorData.error || "Failed to fetch Stripe prices.");
      }

      return priceResponse.json() as Promise<StripePriceData[]>;
    };

    const enrichProduct = (
      supaProduct: Product,
      stripePriceDataArray: StripePriceData[]
    ) => {
      const CentsInDollar = 100;
      const stripeInfo = stripePriceDataArray.find(
        (sp) => sp.id === supaProduct.stripe_price_id && !sp.error
      );
      if (stripeInfo && stripeInfo.unit_amount !== null) {
        return {
          ...supaProduct,
          display_price: stripeInfo.unit_amount / CentsInDollar,
          currency: stripeInfo.currency.toUpperCase(),
          stripe_product_name: stripeInfo.product_name,
          stripe_product_description: stripeInfo.product_description,
        };
      }
      return {
        ...supaProduct,
        display_price: 0,
        currency: "N/A",
      };
    };

    const parseResponseJson = async (
      response: Response
    ): Promise<unknown | null> => {
      try {
        return await response.json();
      } catch (_error) {
        return null;
      }
    };

    const extractPriceIds = (items: Product[]): string[] =>
      items
        .map((item) => item.stripe_price_id)
        .filter(
          (id): id is string => typeof id === "string" && id.trim() !== ""
        );

    const applyFallbackPricing = (items: Product[]) => {
      setProducts(
        items.map((item) => ({
          ...item,
          display_price: 0,
          currency: "USD",
        }))
      );
    };

    const handleSupabaseProducts = async (supabaseProducts: Product[]) => {
      if (supabaseProducts.length === 0) {
        setProducts([]);
        return;
      }

      const priceIds = extractPriceIds(supabaseProducts);

      if (priceIds.length === 0) {
        applyFallbackPricing(supabaseProducts);
        return;
      }

      const stripePriceDataArray = await fetchStripePrices(priceIds);
      setProducts(
        supabaseProducts.map((supaProduct) =>
          enrichProduct(supaProduct, stripePriceDataArray)
        )
      );
    };

    const parseErrorMessage = (caughtError: unknown): string => {
      if (
        caughtError &&
        typeof caughtError === "object" &&
        "message" in caughtError &&
        typeof (caughtError as { message?: unknown }).message === "string"
      ) {
        return (caughtError as { message: string }).message;
      }

      return "Failed to fetch eCards and their prices. Please try again.";
    };

    const fetchSupabaseProducts = async (): Promise<Product[]> => {
      const response = await fetch("/api/products/ecard");
      const payload = await parseResponseJson(response);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Failed to fetch eCards";
        throw new Error(message);
      }

      if (!Array.isArray(payload)) {
        return [];
      }

      return payload as Product[];
    };

    const loadEcardProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabaseProducts = await fetchSupabaseProducts();
        await handleSupabaseProducts(supabaseProducts);
      } catch (caughtError: unknown) {
        setError(parseErrorMessage(caughtError));
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (loading) {
      return;
    }

    if (session && isInstructor) {
      loadEcardProducts();
      return;
    }

    setError(null);
    setIsLoading(false);
    setProducts([]);
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
    if (quantity < 1) {
      return;
    }

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
    if (newQuantity < 1) {
      return;
    }

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

  const calculateTotal = () =>
    cartItems.reduce(
      (total, item) => total + item.product.display_price * item.quantity,
      0
    );

  const handleCartCheckout = async () => {
    if (cartItems.length === 0) {
      return;
    }

    // Track checkout initiation
    posthog.capture("ecard_checkout_initiated", {
      cartItems: cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.display_price,
      })),
      totalItems: cartItems.length,
      totalValue: cartItems.reduce(
        (total, item) => total + item.product.display_price * item.quantity,
        0
      ),
      userId: session?.user?.id,
    });

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
        // Track successful checkout redirect
        posthog.capture("ecard_checkout_redirected", {
          cartItems: cartItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
          })),
          totalItems: cartItems.length,
          userId: session?.user?.id,
        });

        window.location.href = data.url;
      } else {
        // Track checkout error
        posthog.capture("ecard_checkout_error", {
          error: data.error || "Unknown error",
          cartItems: cartItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
          })),
          userId: session?.user?.id,
        });

        setError(
          data.error || "Could not initiate checkout. Please try again."
        );
      }
    } catch (_err) {
      // Track unexpected error
      posthog.capture("ecard_checkout_error", {
        error: "Network or server error",
        cartItems: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
        })),
        userId: session?.user?.id,
      });

      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingProductIds([]);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
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
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-red-600">
            Access Denied. You must be logged in.
          </p>
          <Link className="btn btn-primary mt-4 inline-block" href="/login">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-red-600">
            Access Denied. You must be an approved instructor.
          </p>
          <Link
            className="btn btn-primary mt-4 inline-block"
            href="/my-account"
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
      <div className="mb-4 flex justify-end">
        <button
          className="relative flex items-center rounded-lg bg-primary px-4 py-2 text-white shadow-sm transition-colors hover:bg-primary-dark"
          onClick={() => setIsCartOpen(!isCartOpen)}
          type="button"
        >
          <ShoppingCart className="mr-2" />
          <span>
            Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
          </span>
          {cartItems.length > 0 && (
            <span className="-top-2 -right-2 absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Shopping Cart Dropdown */}
      {isCartOpen && (
        <div className="fixed top-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-gray-200 border-l bg-white shadow-xl md:w-96">
          <div className="flex items-center justify-between border-gray-200 border-b p-4">
            <h2 className="font-semibold text-xl">Your Cart</h2>
            <button
              aria-label="Close cart"
              className="rounded-full p-1 hover:bg-gray-100"
              onClick={() => setIsCartOpen(false)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <ShoppingCart className="mb-4 text-gray-300" size={48} />
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    className="flex rounded-lg border p-3 shadow-sm"
                    key={item.product.id}
                  >
                    <div className="mr-3 h-16 w-16 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                        height={64}
                        src={getImageUrl(item.product.image_urls)}
                        width={64}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-gray-500 text-sm">
                        ${item.product.display_price.toFixed(2)} each
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded border">
                          <button
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            type="button"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2">{item.quantity}</span>
                          <button
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            type="button"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          className="p-1 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.product.id)}
                          type="button"
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

          <div className="border-gray-200 border-t p-4">
            {cartItems.length > 0 && (
              <button
                className="mb-4 inline-block text-red-500 text-sm hover:underline"
                onClick={clearCart}
                type="button"
              >
                Clear Cart
              </button>
            )}

            <div className="mb-4 flex justify-between font-semibold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>

            <button
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50"
              disabled={cartItems.length === 0 || loadingProductIds.length > 0}
              onClick={handleCartCheckout}
              type="button"
            >
              {loadingProductIds.length > 0
                ? "Processing..."
                : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      )}

      <h1 className="mb-8 text-center font-bold text-3xl">eCards</h1>

      {error && <p className="mb-4 text-center text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div
            className="flex h-full flex-col overflow-hidden rounded-lg border shadow-md transition-shadow hover:shadow-lg"
            key={product.id}
          >
            <div className="h-48 overflow-hidden">
              <Image
                alt={product.stripe_product_name || product.name}
                className="h-full w-full object-cover"
                height={192}
                src={getImageUrl(product.image_urls)}
                width={300}
              />
            </div>
            <div className="flex flex-grow flex-col p-4">
              <h3 className="mb-2 font-semibold text-lg">{product.name}</h3>
              <p className="mb-4 text-gray-600 text-sm">
                {product.description}
              </p>
              <div className="mt-auto font-semibold text-lg text-primary">
                ${product.display_price.toFixed(2)} each
              </div>
            </div>

            <div className="mt-auto border-t p-4 pt-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded border">
                  <button
                    className="bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                    onClick={() =>
                      handleQuantityChange(
                        product.id,
                        Math.max(1, (selectedQuantities[product.id] || 1) - 1)
                      )
                    }
                    type="button"
                  >
                    <Minus size={10} />
                  </button>
                  <input
                    className="w-12 border-0 py-1 text-center focus:ring-0"
                    min="1"
                    onChange={(e) =>
                      handleQuantityChange(
                        product.id,
                        Number.parseInt(e.target.value, 10) || 1
                      )
                    }
                    type="number"
                    value={selectedQuantities[product.id] || 1}
                  />
                  <button
                    className="bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                    onClick={() =>
                      handleQuantityChange(
                        product.id,
                        (selectedQuantities[product.id] || 1) + 1
                      )
                    }
                    type="button"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <button
                  className="flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-white shadow-sm transition-colors hover:bg-primary-dark"
                  onClick={() => addToCart(product)}
                  type="button"
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
