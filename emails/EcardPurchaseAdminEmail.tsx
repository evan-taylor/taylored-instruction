import {
  Amounts,
  Details,
  Paragraph,
  TextLink,
  Title,
} from "./components/blocks";
import { EmailLayout, FooterText } from "./components/layout";

type CartItem = {
  name: string;
  quantity: string;
};

type EcardPurchaseAdminEmailProps = {
  itemName?: string;
  quantity?: string;
  price?: string;
  customerEmail?: string;
  sessionId?: string;
  cartItems?: CartItem[];
};

export default function EcardPurchaseAdminEmail({
  itemName,
  quantity,
  price,
  customerEmail,
  sessionId,
  cartItems,
}: EcardPurchaseAdminEmailProps) {
  const items = cartItems?.length
    ? cartItems
    : [itemName && quantity ? { name: itemName, quantity } : null].filter(
        (item) => item !== null
      );
  return (
    <EmailLayout
      footer={
        <FooterText>
          Sent from the eCard shop on tayloredinstruction.com. Reply to answer
          the customer directly.
        </FooterText>
      }
      preview={`${customerEmail ?? "A customer"} paid $${price ?? "0.00"}.`}
    >
      <Title>New eCard order</Title>
      {items.length ? null : (
        <Paragraph>
          The order’s items couldn’t be read. Check the Checkout Session in
          Stripe.
        </Paragraph>
      )}
      <Amounts
        rows={items.map((item) => ({
          label: item.name,
          value: `× ${item.quantity}`,
        }))}
        total={price ? { label: "Total", value: `$${price}` } : undefined}
      />
      <Details
        rows={[
          {
            label: "Customer",
            value: customerEmail ? (
              <TextLink href={`mailto:${customerEmail}`}>
                {customerEmail}
              </TextLink>
            ) : (
              "Not provided"
            ),
          },
          { label: "Stripe Checkout Session", value: sessionId ?? "Unknown" },
        ]}
      />
    </EmailLayout>
  );
}

EcardPurchaseAdminEmail.PreviewProps = {
  price: "84.00",
  customerEmail: "instructor@example.com",
  sessionId: "cs_test_a1B2c3D4e5F6g7H8i9J0",
  cartItems: [
    { name: "BLS Provider eCard", quantity: "3" },
    { name: "Heartsaver CPR AED eCard", quantity: "1" },
  ],
} satisfies EcardPurchaseAdminEmailProps;
