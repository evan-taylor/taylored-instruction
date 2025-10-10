import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

type AlignmentInterestEmailProps = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hasCertification: "Yes" | "No";
  agencies?: string[];
  message?: string;
  smsOptIn?: boolean;
  smsOptOut?: boolean;
};

export default function AlignmentInterestEmail({
  firstName,
  lastName,
  email,
  phone,
  hasCertification,
  agencies,
  message,
  smsOptIn,
  smsOptOut,
}: AlignmentInterestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Alignment Interest Form Submission</Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-black">
          <Container>
            <Section className="my-10 rounded-md border border-black/10 bg-white px-10 py-4">
              <Heading className="leading-tight">
                New Alignment Interest Submission
              </Heading>
              <Text>You received the following submission:</Text>
              <Hr />
              <Text>
                <strong>Name:</strong> {firstName} {lastName}
              </Text>
              <Text>
                <strong>Email:</strong> {email}
              </Text>
              <Text>
                <strong>Phone:</strong> {phone}
              </Text>
              <Text>
                <strong>Holds Certification?:</strong> {hasCertification}
              </Text>
              {hasCertification === "Yes" &&
                agencies &&
                agencies.length > 0 && (
                  <Text>
                    <strong>Agencies:</strong> {agencies.join(", ")}
                  </Text>
                )}
              {message && (
                <Text>
                  <strong>Message:</strong>
                  <br />
                  {message}
                </Text>
              )}
              <Text>
                <strong>SMS Opt-In:</strong> {(() => {
                  if (smsOptIn) {
                    return "Yes";
                  }
                  if (smsOptOut) {
                    return "No (opted out)";
                  }
                  return "No";
                })()}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
