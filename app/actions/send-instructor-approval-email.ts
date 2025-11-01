"use server";

import React from "react";
import { z } from "zod";
import InstructorApprovalEmail from "@/emails/InstructorApprovalEmail";
import { getResendClient } from "@/lib/resend";

const fromEmail = process.env.FROM_EMAIL || "info@tayloredinstruction.com";

const ApprovalEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

type SendApprovalEmailResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function sendInstructorApprovalEmail(
  email: string,
  name: string
): Promise<SendApprovalEmailResult> {
  const validatedFields = ApprovalEmailSchema.safeParse({ email, name });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join("; ");
    return { success: false, error: `Invalid data. ${errors}` };
  }

  const { email: validatedEmail, name: validatedName } = validatedFields.data;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return {
      success: false,
      error: "Email service not configured. Please contact support.",
    };
  }

  try {
    const emailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`,
      to: [validatedEmail],
      subject: "You're approved as an instructor at Taylored Instruction",
      react: React.createElement(InstructorApprovalEmail, {
        firstName: validatedName,
      }),
    });

    if (emailData.error) {
      return {
        success: false,
        error: `Failed to send approval email: ${emailData.error.message}`,
      };
    }

    return {
      success: true,
      message: "Approval email sent successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to send approval email: ${errorMessage}`,
    };
  }
}
