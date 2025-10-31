import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

type InstructorApprovalEmailProps = {
  firstName: string;
};

export const InstructorApprovalEmail: React.FC<
  Readonly<InstructorApprovalEmailProps>
> = ({ firstName }) => (
  <Html>
    <Head />
    <Preview>You've been approved as an instructor!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>
          Congratulations, {firstName}! You're Approved!
        </Heading>
        <Text style={paragraph}>
          We're excited to let you know that you've been approved as an
          instructor at Taylored Instruction.
        </Text>
        <Text style={paragraph}>
          You now have access to purchase digital eCards and other instructor
          resources through your account.
        </Text>
        <Hr style={hr} />
        <Text style={paragraph}>Get started by logging into your account:</Text>
        <Link href="https://www.tayloredinstruction.com/login" style={link}>
          Log In to Your Account
        </Link>
        <br />
        <Link href="https://www.tayloredinstruction.com/ecards" style={link}>
          Purchase eCards
        </Link>
        <Hr style={hr} />
        <Text style={paragraph}>
          If you have any questions or need assistance, please don't hesitate to
          reach out to us.
        </Text>
        <Text style={footer}>Taylored Instruction | Vancouver, WA</Text>
      </Container>
    </Body>
  </Html>
);

export default InstructorApprovalEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  border: "1px solid #f0f0f0",
  borderRadius: "4px",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  padding: "0 20px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#484848",
  padding: "0 20px",
};

const link = {
  color: "#2b6cb0",
  textDecoration: "underline",
  marginLeft: "20px",
  display: "inline-block",
  marginBottom: "10px",
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
