import { v } from "convex/values";
import { Resend } from "resend";
import { SUPPORT_EMAIL } from "../shared/email";
import { internalAction } from "./_generated/server";

const { RESEND_API_KEY } = process.env;
const FROM_EMAIL =
  process.env.FROM_EMAIL || "info@mail.tayloredinstruction.com";
const WEBSITE_NAME = process.env.WEBSITE_NAME || "Taylored Instruction";
const { RESEND_AUDIENCE_ID } = process.env;

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
        replyTo: SUPPORT_EMAIL,
        subject,
        text: textBody,
      });

      if (RESEND_AUDIENCE_ID) {
        try {
          await resend.contacts.create({
            audienceId: RESEND_AUDIENCE_ID,
            email: args.email,
          });
        } catch {
          // Intentionally ignore audience errors
        }
      }
    } catch {
      // Intentionally ignore email errors to not block approval flow
    }
  },
});
