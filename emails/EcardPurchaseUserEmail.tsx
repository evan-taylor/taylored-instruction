import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr
} from '@react-email/components';

interface EcardPurchaseUserEmailProps {
  itemName?: string;
  quantity?: string;
  price?: string;
}

export const EcardPurchaseUserEmail: React.FC<Readonly<EcardPurchaseUserEmailProps>> = ({
  itemName,
  quantity,
  price
}) => (
  <Html>
    <Head />
    <Preview>Your eCard Purchase Confirmation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Thank you for your eCard Purchase!</Heading>
        <Text style={paragraph}>
          You have successfully purchased {quantity} x {itemName} for a total of ${price}.
        </Text>
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
  padding: '0 20px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 20px',
}; 