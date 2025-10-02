import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import EcardPurchaseAdminEmail from "@/emails/EcardPurchaseAdminEmail";
import EcardPurchaseUserEmail from "@/emails/EcardPurchaseUserEmail";
import { getResendClient } from "@/lib/resend";

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

const fromEmail = process.env.FROM_EMAIL || "info@tayloredinstruction.com";
const adminEmail = process.env.ADMIN_EMAIL || "info@tayloredinstruction.com";

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId in request body." },
      { status: 400 }
    );
  }

  const sendCartEmails = async (
    cartItems: CartItem[],
    totalPrice: string,
    customerEmail: string
  ) => {
    const adminEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [adminEmail],
      subject: "New Multi-Item eCard Purchase",
      react: EcardPurchaseAdminEmail({
        itemName: "Multiple Products",
        quantity: cartItems
          .reduce((sum, item) => sum + item.quantity, 0)
          .toString(),
        price: totalPrice,
        customerEmail,
        sessionId,
        cartItems: cartItems.map((item) => ({
          name: item.productName,
          quantity: item.quantity.toString(),
        })),
      }),
    });
    if (adminEmailData.error) {
      // Intentionally not failing request on email notification issues
    }
    const userEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [customerEmail],
      subject: "Your eCard Purchase Confirmation",
      react: EcardPurchaseUserEmail({
        itemName: "Multiple Products",
        quantity: cartItems
          .reduce((sum, item) => sum + item.quantity, 0)
          .toString(),
        price: totalPrice,
        cartItems: cartItems.map((item) => ({
          name: item.productName,
          quantity: item.quantity.toString(),
        })),
      }),
    });
    if (userEmailData.error) {
      // Intentionally not failing request on email notification issues
    }
  };

  const sendSingleProductEmails = async (
    itemName: string,
    quantity: string,
    totalPrice: string,
    customerEmail: string
  ) => {
    const adminEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [adminEmail],
      subject: `New eCard Purchase: ${itemName}`,
      react: EcardPurchaseAdminEmail({
        itemName,
        quantity,
        price: totalPrice,
        customerEmail,
        sessionId,
      }),
    });
    if (adminEmailData.error) {
      // Intentionally not failing request on email notification issues
    }
    const userEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [customerEmail],
      subject: "Your eCard Purchase Confirmation",
      react: EcardPurchaseUserEmail({
        itemName,
        quantity,
        price: totalPrice,
      }),
    });
    if (userEmailData.error) {
      // Intentionally not failing request on email notification issues
    }
  };

  try {
    const session =
      await getStripeClient().checkout.sessions.retrieve(sessionId);
    const customerEmail = session.customer_email;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email not found in session." },
        { status: 400 }
      );
    }

    const CENTS_IN_DOLLAR = 100;
    const totalPrice = session.amount_total
      ? (session.amount_total / CENTS_IN_DOLLAR).toFixed(2)
      : "0.00";

    if (!session.metadata) {
      return NextResponse.json(
        { error: "Stripe session metadata is missing." },
        { status: 400 }
      );
    }

    // Handle cart-based checkout (multiple products)
    if (session.metadata.cartItems) {
      try {
        const cartItems: CartItem[] = JSON.parse(session.metadata.cartItems);
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
          throw new Error("Invalid cart items format");
        }
        await sendCartEmails(cartItems, totalPrice, customerEmail);
      } catch (_error) {
        return NextResponse.json(
          { error: "Invalid cart items format." },
          { status: 400 }
        );
      }
    }
    // Handle single product checkout
    else if (
      typeof session.metadata.productName === "string" &&
      typeof session.metadata.quantity === "string"
    ) {
      await sendSingleProductEmails(
        session.metadata.productName,
        session.metadata.quantity,
        totalPrice,
        customerEmail
      );
    } else {
      return NextResponse.json(
        { error: "Stripe session metadata has invalid format." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? ((error as Record<string, unknown>).message as string)
        : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
