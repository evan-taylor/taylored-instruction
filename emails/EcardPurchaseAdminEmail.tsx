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

interface EcardPurchaseAdminEmailProps {
  cartItems?: CartItem[];
  customerEmail?: string;
  itemName?: string;
  price?: string;
  quantity?: string;
  sessionId?: string;
}

export const EcardPurchaseAdminEmail: React.FC<
  Readonly<EcardPurchaseAdminEmailProps>
> = ({ itemName, quantity, price, customerEmail, sessionId, cartItems }) => (
  <Html>
    <Head />
    <Preview>New eCard Purchase</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New eCard Purchase Notification</Heading>
        <Text style={paragraph}>You have received a new eCard purchase.</Text>
        <Hr style={hr} />

        {cartItems && cartItems.length > 0 && (
          <Section style={section}>
            <Text style={subHeading}>Purchased Items:</Text>
            {cartItems.map((item) => (
              <Row key={item.name} style={itemRow}>
                <Column style={itemDetailsColumn}>
                  {item.name} (Qty: {item.quantity})
                </Column>
              </Row>
            ))}
          </Section>
        )}
        {(!cartItems || cartItems.length === 0) && itemName && quantity && (
          <Section style={section}>
            <Row>
              <Column style={labelColumn}>Item Name:</Column>
              <Column style={valueColumn}>{itemName}</Column>
            </Row>
            <Row>
              <Column style={labelColumn}>Quantity:</Column>
              <Column style={valueColumn}>{quantity}</Column>
            </Row>
          </Section>
        )}
        {(!cartItems || cartItems.length === 0) && !(itemName && quantity) && (
          <Section style={section}>
            <Text style={paragraph}>
              Could not determine purchased items. Check session metadata.
            </Text>
          </Section>
        )}

        <Hr style={hr} />

        <Section style={section}>
          <Row>
            <Column style={labelColumn}>Total Price:</Column>
            <Column style={valueColumn}>${price}</Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Customer Email:</Column>
            <Column style={valueColumn}>{customerEmail}</Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Session ID:</Column>
            <Column style={valueColumn}>{sessionId}</Column>
          </Row>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          This email was sent from the eCard shop on tayloredinstruction.com
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EcardPurchaseAdminEmail;

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

const subHeading = {
  color: "#484848",
  fontSize: "18px",
  fontWeight: "600",
  padding: "10px 30px 5px 30px",
};

const section = {
  padding: "0 30px",
};

const itemRow = {
  marginBottom: "8px",
};

const itemDetailsColumn = {
  color: "#333",
  fontSize: "16px",
  paddingLeft: "10px",
};

const labelColumn = {
  color: "#555",
  fontWeight: "600",
  paddingBottom: "8px",
  verticalAlign: "top",
  width: "150px",
};

const valueColumn = {
  color: "#333",
  fontSize: "16px",
  paddingBottom: "8px",
  verticalAlign: "top",
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
