import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

interface CartItem {
  name: string;
  quantity: string;
}

interface EcardPurchaseUserEmailProps {
  cartItems?: CartItem[]; // For multi-item purchases
  itemName?: string; // For single item purchases
  price?: string; // Total price
  quantity?: string; // For single item purchases
}

export const EcardPurchaseUserEmail: React.FC<
  Readonly<EcardPurchaseUserEmailProps>
> = ({ itemName, quantity, price, cartItems }) => (
  <Html>
    <Head />
    <Preview>Your eCard Purchase Confirmation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Thank you for your eCard Purchase!</Heading>

        {cartItems && cartItems.length > 0 && (
          <Section style={section}>
            <Text style={paragraph}>
              Here are the details of your purchase:
            </Text>
            {cartItems.map((item) => (
              <Row key={item.name} style={itemRow}>
                <Column style={itemNameColumn}>{item.name}</Column>
                <Column style={itemQuantityColumn}>Qty: {item.quantity}</Column>
              </Row>
            ))}
            <Hr style={hr} />
            <Row style={totalRow}>
              <Column style={totalLabelColumn}>Total Price:</Column>
              <Column style={totalValueColumn}>${price}</Column>
            </Row>
          </Section>
        )}
        {(!cartItems || cartItems.length === 0) && itemName && quantity && (
          <Section style={section}>
            <Text style={paragraph}>You have successfully purchased:</Text>
            <Row style={itemRow}>
              <Column style={itemNameColumn}>{itemName}</Column>
              <Column style={itemQuantityColumn}>Qty: {quantity}</Column>
            </Row>
            <Hr style={hr} />
            <Row style={totalRow}>
              <Column style={totalLabelColumn}>Total Price:</Column>
              <Column style={totalValueColumn}>${price}</Column>
            </Row>
          </Section>
        )}
        {(!cartItems || cartItems.length === 0) && !(itemName && quantity) && (
          <Text style={paragraph}>
            There was an issue displaying your order details. Please contact
            support.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={paragraph}>
          If you have any questions or need assistance, please reply to this
          email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Taylored Instruction | Vancouver, WA</Text>
      </Container>
    </Body>
  </Html>
);

export default EcardPurchaseUserEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: "4px",
  margin: "0 auto",
  marginBottom: "64px",
  maxWidth: "600px",
  padding: "20px 0 48px",
  width: "100%",
};

const heading = {
  color: "#484848",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.3",
  padding: "0 20px",
};

const paragraph = {
  color: "#484848",
  fontSize: "16px",
  lineHeight: "1.4",
  padding: "0 30px",
};

const section = {
  padding: "0 30px",
};

const itemRow = {
  marginBottom: "10px",
};

const itemNameColumn = {
  color: "#484848",
  fontSize: "16px",
};

const itemQuantityColumn = {
  color: "#484848",
  fontSize: "16px",
  textAlign: "right" as const,
};

const totalRow = {
  fontWeight: "bold",
  marginTop: "15px",
};

const totalLabelColumn = {
  color: "#484848",
  fontSize: "16px",
};

const totalValueColumn = {
  color: "#484848",
  fontSize: "18px",
  fontWeight: "700",
  textAlign: "right" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 30px",
};
