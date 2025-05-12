import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
  Link
} from '@react-email/components';

interface ContactConfirmationEmailProps {
  firstName: string;
}

export const ContactConfirmationEmail: React.FC<Readonly<ContactConfirmationEmailProps>> = ({ 
  firstName 
}) => (
  <Html>
    <Head />
    <Preview>We've received your message!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Thanks for Reaching Out, {firstName}!</Heading>
        <Text style={paragraph}>
          We have received your message and appreciate you contacting Taylored Instruction.
        </Text>
        <Text style={paragraph}>
          One of our team members will review your inquiry and get back to you as soon as possible, typically within 1-2 business days.
        </Text>
        <Hr style={hr} />
        <Text style={paragraph}>
          In the meantime, feel free to browse our website or check our class schedule:
        </Text>
        <Link href="https://www.tayloredinstruction.com/classes" style={link}>
          View Our Classes
        </Link>
        <br />
         <Link href="https://www.hovn.app/tayloredinstruction" target="_blank" rel="noopener noreferrer" style={link}>
            Register for Classes
         </Link>
        <Hr style={hr} />
        <Text style={footer}>
          Taylored Instruction | Vancouver, WA
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ContactConfirmationEmail;

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

const link = {
  color: '#2b6cb0', // Primary color
  textDecoration: 'underline',
  marginLeft: '20px',
  display: 'inline-block',
  marginBottom: '10px',
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