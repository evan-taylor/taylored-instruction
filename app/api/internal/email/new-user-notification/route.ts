import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getResendClient } from "@/lib/resend";

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

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
    const displayEmail = userEmail || "No email provided";
    const escapedUserId = escapeHtml(userId);
    const escapedDisplayEmail = escapeHtml(displayEmail);

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
      const subject = "New Instructor Signup";
      const htmlBody = `
        <h1>New Instructor Signup</h1>
        <p>A new instructor has signed up:</p>
        <ul>
          <li><strong>User ID:</strong> ${escapedUserId}</li>
          <li><strong>Email:</strong> ${escapedDisplayEmail}</li>
        </ul>
        <p>You can manage this instructor and others by visiting the <a href="https://tayloredinstruction.com/admin/instructors">Manage Instructors page</a>.</p>
      `;

      const emailData = await getResendClient().emails.send({
        from: `Taylored Instruction <${fromEmail}>`,
        to: [adminEmail],
        subject,
        html: htmlBody,
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
