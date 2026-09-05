"use server";

import React from "react";
import { z } from "zod";
import ContactConfirmationEmail from "@/emails/ContactConfirmationEmail";
import ContactFormEmail from "@/emails/ContactFormEmail";
import PostHogClient from "@/lib/posthog";
import { getResendClient } from "@/lib/resend";

// Resend client will be initialized lazily via getResendClient()
const adminEmail = "info@tayloredinstruction.com"; // Your admin email
const fromEmail = "info@mail.tayloredinstruction.com"; // Use verified Resend domain

// Define schema for form validation
const MIN_MESSAGE_LENGTH = 5;
const ContactFormSchema = z.object({
  contactMethod: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return [val];
      }
      if (Array.isArray(val)) {
        return val;
      }
      return [];
    },
    z.array(z.string()).min(1, "At least one contact method must be selected")
  ),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  location: z.string().optional(),
  message: z
    .string()
    .min(MIN_MESSAGE_LENGTH, "Message must be at least 5 characters"),
  otherLocation: z.string().optional(),
  phone: z.string().optional(),
  smsOptIn: z.preprocess((val) => val === "on", z.boolean()).optional(),
  smsOptOut: z.preprocess((val) => val === "on", z.boolean()).optional(),
});

interface SendEmailResult {
  error?: string | null;
  success: boolean;
}

export async function sendContactEmail(
  formData: FormData
): Promise<SendEmailResult> {
  const rawFormDataEntries = Object.fromEntries(formData.entries());

  // Manually handle multiple checkboxes for contactMethod
  const contactMethods = formData.getAll("contactMethod") as string[];
  // rawFormData.contactMethod = contactMethods; // Remove this line

  // Validate using the original entries + the correctly typed contactMethods array
  const validatedFields = ContactFormSchema.safeParse({
    ...rawFormDataEntries,
    contactMethod: contactMethods, // Pass the array here
  });

  if (!validatedFields.success) {
    // Combine multiple errors into a single message
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join("; ");
    return { error: `Invalid form data. ${errors}`, success: false };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    location,
    otherLocation,
    message,
    smsOptIn,
    smsOptOut,
    // contactMethod is already destructured via validatedFields.data
  } = validatedFields.data;

  const contactMethodList = validatedFields.data.contactMethod;

  try {
    // Track contact form submission on server side
    const posthog = PostHogClient();
    await posthog?.capture({
      distinctId: email, // Use email as distinct ID for anonymous users
      event: "contact_form_server_submitted",
      properties: {
        contactMethodCount: contactMethodList.length,
        contactMethods: contactMethodList,
        email,
        firstName,
        hasMessage: message.length > 0,
        lastName,
        location: location || otherLocation || null,
        phone: phone || null,
        smsOptIn,
        smsOptOut,
      },
    });
    await posthog?.shutdown();

    // Send email to admin
    const adminEmailData = await getResendClient().emails.send({
      from: `Contact Form <${fromEmail}>`,
      react: React.createElement(ContactFormEmail, {
        contactMethods: contactMethodList,
        email,
        firstName,
        lastName,
        location,
        message,
        otherLocation,
        phone,
        smsOptIn,
        smsOptOut,
      }),
      replyTo: email,
      subject: `New Contact Form Submission from ${firstName} ${lastName}`,
      to: [adminEmail],
    });

    if (adminEmailData.error) {
      return { error: "Failed to send notification email.", success: false };
    }

    // Send confirmation email to user
    const userEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      react: React.createElement(ContactConfirmationEmail, { firstName }),
      subject: "Message Received - Taylored Instruction",
      to: [email],
    });

    if (userEmailData.error) {
      // Decide if this constitutes a full failure for the user
      // return { success: false, error: 'Failed to send confirmation email.' };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message, success: false };
    }
    return {
      error: "An unexpected error occurred while sending the email.",
      success: false,
    };
  }
}
