"use server";

import React from "react";
import { z } from "zod";
import InstructorApprovalEmail from "@/emails/InstructorApprovalEmail";
import { getResendClient } from "@/lib/resend";

const fromEmail = process.env.FROM_EMAIL || "info@mail.tayloredinstruction.com";

const ApprovalEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

interface SendApprovalEmailResult {
  error?: string;
  message?: string;
  success: boolean;
}

export async function sendInstructorApprovalEmail(
  email: string,
  name: string
): Promise<SendApprovalEmailResult> {
  const validatedFields = ApprovalEmailSchema.safeParse({ email, name });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join("; ");
    return { error: `Invalid data. ${errors}`, success: false };
  }

  const { email: validatedEmail, name: validatedName } = validatedFields.data;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return {
      error: "Email service not configured. Please contact support.",
      success: false,
    };
  }

  try {
    const emailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      react: React.createElement(InstructorApprovalEmail, {
        firstName: validatedName,
      }),
      subject: "You're approved as an instructor at Taylored Instruction",
      to: [validatedEmail],
    });

    if (emailData.error) {
      return {
        error: `Failed to send approval email: ${emailData.error.message}`,
        success: false,
      };
    }

    return {
      message: "Approval email sent successfully",
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      error: `Failed to send approval email: ${errorMessage}`,
      success: false,
    };
  }
}
