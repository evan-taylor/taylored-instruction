import { v } from "convex/values";
import { Resend } from "resend";
import { internalAction } from "./_generated/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const ADMIN_NOTIF_EMAIL = process.env.ADMIN_NOTIF_EMAIL;
const WEBSITE_NAME = process.env.WEBSITE_NAME || "Taylored Instruction";
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export const sendNewUserAdminNotification = internalAction({
  args: {
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!(RESEND_API_KEY && FROM_EMAIL && ADMIN_NOTIF_EMAIL)) {
      return;
    }

    const userEmail = args.userEmail || "No email provided";

    try {
      const resend = new Resend(RESEND_API_KEY);
      const subject = "New Instructor Signup";
      const htmlBody = `
        <h1>New Instructor Signup</h1>
        <p>A new instructor has signed up:</p>
        <ul>
          <li><strong>User ID:</strong> ${args.userId}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
        </ul>
        <p>You can manage this instructor and others by visiting the <a href="https://www.tayloredinstruction.com/admin/instructors">Manage Instructors page</a>.</p>
      `;

      await resend.emails.send({
        from: `${WEBSITE_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_NOTIF_EMAIL],
        subject,
        html: htmlBody,
      });
    } catch (_error) {
      // Intentionally ignore email errors to not block user signup
    }
  },
});

export const sendInstructorApprovalEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!(RESEND_API_KEY && FROM_EMAIL)) {
      return;
    }

    try {
      const resend = new Resend(RESEND_API_KEY);
      const subject = `Instructor Account Approved - ${WEBSITE_NAME}`;
      const textBody = `Hey ${args.name || "Instructor"},\n\nCongratulations! Your instructor account for ${WEBSITE_NAME} has been approved.\n\nYou can now access instructor resources by logging into your account.\n\nIf you have any questions, please feel free to reach out to us.\n\nBest,\n${WEBSITE_NAME}`;

      await resend.emails.send({
        from: `${WEBSITE_NAME} <${FROM_EMAIL}>`,
        to: [args.email],
        subject,
        text: textBody,
      });

      if (RESEND_AUDIENCE_ID) {
        try {
          await resend.contacts.create({
            audienceId: RESEND_AUDIENCE_ID,
            email: args.email,
          });
        } catch (_audienceError) {
          // Intentionally ignore audience errors
        }
      }
    } catch (_error) {
      // Intentionally ignore email errors to not block approval flow
    }
  },
});
