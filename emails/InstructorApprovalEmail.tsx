import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

type InstructorApprovalEmailProps = {
  firstName: string;
};

export default function InstructorApprovalEmail({
  firstName,
}: InstructorApprovalEmailProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://tayloredinstruction.com";

  return (
    <Html>
      <Head />
      <Preview>
        You're approved as an instructor at Taylored Instruction
      </Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-black">
          <Container>
            <Section className="my-10 rounded-md border border-black/10 bg-white px-10 py-4">
              <Heading className="leading-tight">
                Welcome to Taylored Instruction!
              </Heading>
              <Text>Hi {firstName},</Text>
              <Text>
                Great news! Your instructor login on our website has been
                approved. You now have access to all instructor resources and
                features.
              </Text>
              <Text>You can now:</Text>
              <ul>
                <li>Purchase digital eCards for your students</li>
                <li>Access instructor resources and documentation</li>
                <li>Manage your instructor account</li>
              </ul>
              <Section className="my-6 text-center">
                <Button
                  className="rounded bg-blue-600 px-6 py-3 text-center text-white"
                  href={`${baseUrl}/login`}
                >
                  Log In to Your Account
                </Button>
              </Section>
              <Text>
                Once logged in, visit the{" "}
                <Link
                  className="text-blue-600 underline"
                  href={`${baseUrl}/ecards`}
                >
                  eCards page
                </Link>{" "}
                to purchase digital certification cards for your students.
              </Text>
              <Text>
                If you have any questions or need assistance, please don't
                hesitate to reach out to us at{" "}
                <Link
                  className="text-blue-600 underline"
                  href="mailto:info@tayloredinstruction.com"
                >
                  info@tayloredinstruction.com
                </Link>{" "}
                or call or text us at{" "}
                <Link
                  className="text-blue-600 underline"
                  href="tel:360-685-8199"
                >
                  360-685-8199
                </Link>
                .
              </Text>
              <Hr />
              <Text>Best Regards,</Text>
              <Text>Evan Taylor, Taylored Instruction</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
