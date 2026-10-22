import { Amounts, Paragraph, Title } from "./components/blocks";
import { EmailLayout } from "./components/layout";

type CartItem = {
  name: string;
  quantity: string;
};

type EcardPurchaseUserEmailProps = {
  /** Single-item purchases send the item directly instead of a cart. */
  itemName?: string;
  quantity?: string;
  price?: string;
  cartItems?: CartItem[];
};

export default function EcardPurchaseUserEmail({
  itemName,
  quantity,
  price,
  cartItems,
}: EcardPurchaseUserEmailProps) {
  const items = cartItems?.length
    ? cartItems
    : [itemName && quantity ? { name: itemName, quantity } : null].filter(
        (item) => item !== null
      );
  return (
    <EmailLayout preview="Thanks for your order. Here’s your receipt.">
      <Title>Your eCard order is confirmed</Title>
      {items.length ? (
        <>
          <Paragraph>
            Thanks for your order. Here’s your receipt for your records.
          </Paragraph>
          <Amounts
            rows={items.map((item) => ({
              label: item.name,
              value: `× ${item.quantity}`,
            }))}
            total={price ? { label: "Total", value: `$${price}` } : undefined}
          />
        </>
      ) : (
        <Paragraph>
          Thanks for your order. We couldn’t include the order details here, so
          reply to this email and we’ll send them over.
        </Paragraph>
      )}
    </EmailLayout>
  );
}

EcardPurchaseUserEmail.PreviewProps = {
  price: "84.00",
  cartItems: [
    { name: "BLS Provider eCard", quantity: "3" },
    { name: "Heartsaver CPR AED eCard", quantity: "1" },
  ],
} satisfies EcardPurchaseUserEmailProps;
