import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Row,
  Column,
  Text,
  Hr
} from '@react-email/components';

interface CartItem {
  name: string;
  quantity: string;
}

interface EcardPurchaseAdminEmailProps {
  itemName?: string;
  quantity?: string;
  price?: string;
  customerEmail?: string;
  sessionId?: string;
  cartItems?: CartItem[];
}

export const EcardPurchaseAdminEmail: React.FC<Readonly<EcardPurchaseAdminEmailProps>> = ({
  itemName,
  quantity,
  price,
  customerEmail,
  sessionId,
  cartItems,
}) => (
  <Html>
    <Head />
    <Preview>New eCard Purchase</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New eCard Purchase Notification</Heading>
        <Text style={paragraph}>You have received a new eCard purchase.</Text>
        <Hr style={hr} />

        {cartItems && cartItems.length > 0 ? (
          <Section style={section}>
            <Text style={subHeading}>Purchased Items:</Text>
            {cartItems.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemDetailsColumn}>
                  {item.name} (Qty: {item.quantity})
                </Column>
              </Row>
            ))}
          </Section>
        ) : itemName && quantity ? (
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
        ) : (
          <Section style={section}>
            <Text style={paragraph}>Could not determine purchased items. Check session metadata.</Text>
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

const subHeading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#484848',
  padding: '10px 30px 5px 30px',
};

const section = {
  padding: '0 30px',
};

const itemRow = {
  marginBottom: '8px',
};

const itemDetailsColumn = {
  fontSize: '16px',
  color: '#333',
  paddingLeft: '10px',
};

const labelColumn = {
  width: '150px',
  verticalAlign: 'top',
  paddingBottom: '8px',
  fontWeight: '600',
  color: '#555',
};

const valueColumn = {
  verticalAlign: 'top',
  paddingBottom: '8px',
  color: '#333',
  fontSize: '16px',
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