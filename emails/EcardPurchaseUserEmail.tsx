import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
  Section,
  Row,
  Column,
} from '@react-email/components';

interface CartItem {
  name: string;
  quantity: string;
}

interface EcardPurchaseUserEmailProps {
  itemName?: string; // For single item purchases
  quantity?: string; // For single item purchases
  price?: string;    // Total price
  cartItems?: CartItem[]; // For multi-item purchases
}

export const EcardPurchaseUserEmail: React.FC<Readonly<EcardPurchaseUserEmailProps>> = ({
  itemName,
  quantity,
  price,
  cartItems,
}) => (
  <Html>
    <Head />
    <Preview>Your eCard Purchase Confirmation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Thank you for your eCard Purchase!</Heading>
        
        {cartItems && cartItems.length > 0 ? (
          <Section style={section}>
            <Text style={paragraph}>Here are the details of your purchase:</Text>
            {cartItems.map((item, index) => (
              <Row key={index} style={itemRow}>
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
        ) : itemName && quantity ? (
          <Section style={section}>
            <Text style={paragraph}>
              You have successfully purchased:
            </Text>
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
        ) : (
          <Text style={paragraph}>
            There was an issue displaying your order details. Please contact support.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={paragraph}>
          If you have any questions or need assistance, please reply to this email.
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
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
  width: '100%',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  padding: '0 20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  padding: '0 30px',
};

const section = {
  padding: '0 30px',
};

const itemRow = {
  marginBottom: '10px',
};

const itemNameColumn = {
  fontSize: '16px',
  color: '#484848',
};

const itemQuantityColumn = {
  fontSize: '16px',
  color: '#484848',
  textAlign: 'right' as const,
};

const totalRow = {
  marginTop: '15px',
  fontWeight: 'bold',
};

const totalLabelColumn = {
  fontSize: '16px',
  color: '#484848',
};

const totalValueColumn = {
  fontSize: '18px',
  color: '#484848',
  textAlign: 'right' as const,
  fontWeight: '700',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 30px',
}; 