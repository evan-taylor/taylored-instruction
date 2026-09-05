import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import { z } from "zod";
import InstructorApprovalEmail from "@/emails/InstructorApprovalEmail";
import { getResendClient } from "@/lib/resend";

const fromEmail = process.env.FROM_EMAIL || "info@mail.tayloredinstruction.com";
const internalSecret = process.env.INTERNAL_EMAIL_WEBHOOK_SECRET;

const ApprovalEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Require internal webhook secret for authentication
    // Admin UI and Convex both provide this secret
    const secretHeader = req.headers.get("x-internal-email-secret");

    if (!internalSecret) {
      return NextResponse.json(
        { error: "Internal webhook not configured" },
        { status: 500 }
      );
    }

    if (!secretHeader || secretHeader !== internalSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid webhook secret" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedFields = ApprovalEmailSchema.safeParse(body);

    if (!validatedFields.success) {
      const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        { error: `Invalid request data. ${errors}` },
        { status: 400 }
      );
    }

    const { email, name } = validatedFields.data;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        {
          message:
            "Approval email could not be sent due to server config. Please contact support.",
        },
        { status: 200 }
      );
    }

    try {
      const emailData = await getResendClient().emails.send({
        from: `Taylored Instruction <${fromEmail}>`,
        react: React.createElement(InstructorApprovalEmail, {
          firstName: name,
        }),
        subject: "You're approved as an instructor at Taylored Instruction",
        to: [email],
      });

      if (emailData.error) {
        return NextResponse.json(
          {
            error: `Failed to send approval email: ${emailData.error.message}`,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { message: "Approval email sent successfully" },
        { status: 200 }
      );
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : "Unknown email error";
      return NextResponse.json(
        { error: `Failed to send approval email: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
