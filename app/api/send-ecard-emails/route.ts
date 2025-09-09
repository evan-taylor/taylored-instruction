import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import EcardPurchaseAdminEmail from "@/emails/EcardPurchaseAdminEmail";
import EcardPurchaseUserEmail from "@/emails/EcardPurchaseUserEmail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});
const resend = new Resend(process.env.RESEND_API_KEY!);

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

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerEmail = session.customer_email;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email not found in session." },
        { status: 400 }
      );
    }

    const totalPrice = session.amount_total
      ? (session.amount_total / 100).toFixed(2)
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

        const _itemSummary = cartItems
          .map((item) => `${item.productName} (Qty: ${item.quantity})`)
          .join(", ");

        // Send notification email to admin for cart checkout
        const adminEmailData = await resend.emails.send({
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
        }

        // Send confirmation email to the customer for cart checkout
        const userEmailData = await resend.emails.send({
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
        }
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
          sessionId,
        }),
      });

      if (adminEmailData.error) {
      }

      // Send confirmation email to the customer for single product
      const userEmailData = await resend.emails.send({
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
      }
    } else {
      return NextResponse.json(
        { error: "Stripe session metadata has invalid format." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
