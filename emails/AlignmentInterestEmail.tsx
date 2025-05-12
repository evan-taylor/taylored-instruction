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

interface AlignmentInterestEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hasCertification: 'Yes' | 'No';
  agencies?: string[];
  message?: string;
  smsOptIn?: boolean;
}

export default function AlignmentInterestEmail({
  firstName,
  lastName,
  email,
  phone,
  hasCertification,
  agencies,
  message,
  smsOptIn,
}: AlignmentInterestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Alignment Interest Form Submission</Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-black">
          <Container>
            <Section className="bg-white border border-black/10 my-10 px-10 py-4 rounded-md">
              <Heading className="leading-tight">New Alignment Interest Submission</Heading>
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
              {hasCertification === 'Yes' && agencies && agencies.length > 0 && (
                <Text>
                  <strong>Agencies:</strong> {agencies.join(', ')}
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
                <strong>SMS Opt-In:</strong> {smsOptIn ? 'Yes' : 'No'}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
} 