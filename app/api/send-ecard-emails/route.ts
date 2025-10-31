import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import Stripe from "stripe";
import EcardPurchaseAdminEmail from "@/emails/EcardPurchaseAdminEmail";
import EcardPurchaseUserEmail from "@/emails/EcardPurchaseUserEmail";
import { getResendClient } from "@/lib/resend";

// Lazy Stripe initialization to avoid build-time errors
function getStripeClient(): Stripe {
  const StripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!StripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(StripeSecretKey, {
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

const validateSessionId = (sessionId: unknown): string | null => {
  if (!sessionId || typeof sessionId !== "string") {
    return null;
  }
  return sessionId;
};

const parseCartItems = (cartItemsJson: string): CartItem[] | null => {
  try {
    const items: CartItem[] = JSON.parse(cartItemsJson);
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    return items;
  } catch (_error) {
    return null;
  }
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = validateSessionId(body.sessionId);

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
      react: React.createElement(EcardPurchaseAdminEmail, {
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
      react: React.createElement(EcardPurchaseUserEmail, {
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
      react: React.createElement(EcardPurchaseAdminEmail, {
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
      react: React.createElement(EcardPurchaseUserEmail, {
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

    const CentsInDollar = 100;
    const totalPrice = session.amount_total
      ? (session.amount_total / CentsInDollar).toFixed(2)
      : "0.00";

    if (!session.metadata) {
      return NextResponse.json(
        { error: "Stripe session metadata is missing." },
        { status: 400 }
      );
    }

    if (session.metadata.cartItems) {
      const cartItems = parseCartItems(session.metadata.cartItems);
      if (!cartItems) {
        return NextResponse.json(
          { error: "Invalid cart items format." },
          { status: 400 }
        );
      }
      await sendCartEmails(cartItems, totalPrice, customerEmail);
      return NextResponse.json({ success: true });
    }

    if (
      typeof session.metadata.productName === "string" &&
      typeof session.metadata.quantity === "string"
    ) {
      await sendSingleProductEmails(
        session.metadata.productName,
        session.metadata.quantity,
        totalPrice,
        customerEmail
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Stripe session metadata has invalid format." },
      { status: 400 }
    );
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
