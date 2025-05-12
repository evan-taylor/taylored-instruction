import React from 'react';
import {
  Html,
  Body,
  Head,
  Heading,
  Hr,
  Container,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface AlignmentConfirmationEmailProps {
  firstName: string;
}

export default function AlignmentConfirmationEmail({
  firstName,
}: AlignmentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Alignment Interest Received</Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-black">
          <Container>
            <Section className="bg-white border border-black/10 my-10 px-10 py-4 rounded-md">
              <Heading className="leading-tight">Thank You for Your Interest!</Heading>
              <Text>Hi {firstName},</Text>
              <Text>
                We have received your alignment interest form submission. Thank you for considering Taylored Instruction!
              </Text>
              <Text>
                We will review your information and get back to you as soon as possible to discuss potential alignment opportunities.
              </Text>
              <Hr />
              <Text>Best Regards,</Text>
              <Text>The Taylored Instruction Team</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
} 