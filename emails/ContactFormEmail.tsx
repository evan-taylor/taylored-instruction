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

interface ContactFormEmailProps {
  contactMethods?: string[];
  email: string;
  firstName: string;
  lastName: string;
  location?: string;
  message: string;
  otherLocation?: string;
  phone?: string;
  smsOptIn?: boolean;
  smsOptOut?: boolean;
}

export const ContactFormEmail: React.FC<Readonly<ContactFormEmailProps>> = ({
  firstName,
  lastName,
  email,
  phone,
  location,
  otherLocation,
  message,
  smsOptIn,
  smsOptOut,
  contactMethods = [],
}) => (
  <Html>
    <Head />
    <Preview>
      New Contact Form Submission from {firstName} {lastName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New Contact Form Submission</Heading>
        <Text style={paragraph}>
          You have received a new message from your website contact form.
        </Text>
        <Hr style={hr} />

        <Section style={section}>
          <Row>
            <Column style={labelColumn}>First Name:</Column>
            <Column style={valueColumn}>{firstName}</Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Last Name:</Column>
            <Column style={valueColumn}>{lastName}</Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Email:</Column>
            <Column style={valueColumn}>{email}</Column>
          </Row>
          {phone && (
            <Row>
              <Column style={labelColumn}>Phone:</Column>
              <Column style={valueColumn}>{phone}</Column>
            </Row>
          )}
          <Row>
            <Column style={labelColumn}>Location:</Column>
            <Column style={valueColumn}>
              {location === "Other" && otherLocation ? otherLocation : location}
            </Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Message:</Column>
          </Row>
          <Row>
            <Column style={messageValueColumn}>{message}</Column>
          </Row>
          <Row>
            <Column style={labelColumn}>SMS Opt-In:</Column>
            <Column style={valueColumn}>
              {(() => {
                if (smsOptIn) {
                  return "Yes";
                }
                if (smsOptOut) {
                  return "No (opted out)";
                }
                return "No";
              })()}
            </Column>
          </Row>
          <Row>
            <Column style={labelColumn}>Preferred Contact Method(s):</Column>
            <Column style={valueColumn}>
              {contactMethods.join(", ") || "Not specified"}
            </Column>
          </Row>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          This email was sent from the contact form on tayloredinstruction.com
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ContactFormEmail;

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
  padding: "20px 0 48px",
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
  padding: "0 20px",
};

const section = {
  padding: "0 20px",
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
  paddingBottom: "8px",
  verticalAlign: "top",
};

const messageValueColumn = {
  borderLeft: "2px solid #eee",
  color: "#333",
  marginTop: "5px",
  paddingBottom: "8px",
  paddingLeft: "10px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 20px",
};
