import { type NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";
import NewInstructorEmail from "@/emails/NewInstructorEmail";
import { getResendClient } from "@/lib/resend";
import { SUPPORT_EMAIL } from "@/shared/email";

const fromEmail = process.env.FROM_EMAIL || "info@mail.tayloredinstruction.com";
const adminEmail =
  process.env.ADMIN_NOTIF_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "info@tayloredinstruction.com";
const internalSecret = process.env.INTERNAL_EMAIL_WEBHOOK_SECRET;

const NewUserNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userEmail: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
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
    const validatedFields = NewUserNotificationSchema.safeParse(body);

    if (!validatedFields.success) {
      const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        { error: `Invalid request data. ${errors}` },
        { status: 400 }
      );
    }

    const { userId, userEmail } = validatedFields.data;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        {
          message:
            "Notification email could not be sent due to server config. Please contact support.",
        },
        { status: 200 }
      );
    }

    try {
      const subject = "New instructor signup";

      const emailData = await getResendClient().emails.send({
        from: `Taylored Instruction <${fromEmail}>`,
        to: [adminEmail],
        replyTo: SUPPORT_EMAIL,
        subject,
        react: createElement(NewInstructorEmail, {
          userId,
          email: userEmail || undefined,
        }),
      });

      if (emailData.error) {
        return NextResponse.json(
          {
            error: `Failed to send notification email: ${emailData.error.message}`,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { message: "Notification email sent successfully" },
        { status: 200 }
      );
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : "Unknown email error";
      return NextResponse.json(
        { error: `Failed to send notification email: ${errorMessage}` },
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
