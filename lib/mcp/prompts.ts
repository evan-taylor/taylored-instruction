import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function user(text: string) {
  return {
    messages: [
      { role: "user" as const, content: { type: "text" as const, text } },
    ],
  };
}

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "morning_review",
    {
      title: "Morning review",
      description: "Summarize the business state and propose today's actions.",
    },
    () =>
      user(
        "Read the taylored://guide resource, then call dashboard_summary and attention_queue. Summarize revenue and fill for upcoming sessions, list every item needing attention with the tool you would use to resolve it, and ask before taking any action that sends email or moves money."
      )
  );

  server.registerPrompt(
    "enroll_group",
    {
      title: "Enroll a group",
      description:
        "Walk through enrolling an organization's attendees and billing them.",
      argsSchema: {
        organization: z.string().describe("Organization name or id"),
        session: z.string().describe("Session id, code, or description"),
      },
    },
    (args) =>
      user(
        `Enroll a group from "${args.organization}" into "${args.session}". Steps: find or create the organization (list_organizations / save_organization); find the session and its course settings (list_sessions, session_overview, get_course) to learn material and question ids; collect attendee names and emails from me; call enroll with payment=unpaid and the organizationId; then ask whether to bill by invoice (create_invoice) or card (request_payment_email). Confirm the total before billing.`
      )
  );

  server.registerPrompt(
    "close_out_session",
    {
      title: "Close out a session",
      description: "Record attendance and outcomes after a class.",
      argsSchema: { session: z.string().describe("Session id or code") },
    },
    (args) =>
      user(
        `Close out session "${args.session}". Load session_overview and session_roster, show me the attendees with their meetings and outcome definitions, then collect attendance and outcome values from me and record them with record_attendance and record_outcome. Finish by listing anyone who did not complete and ask whether to override_completion.`
      )
  );

  server.registerPrompt(
    "handle_refund",
    {
      title: "Handle a refund or cancellation",
      description:
        "Investigate a customer's order and apply the right refund or cancellation.",
      argsSchema: { email: z.string().describe("Customer email") },
    },
    (args) =>
      user(
        `A customer (${args.email}) wants to cancel or be refunded. Use lookup_customer and get_order to show their seats, what they paid including tax, and what has already been refunded. Propose whether to cancel_seat, refund_order (and how much), transfer_seat, or restore_coupon, and wait for my confirmation before doing anything.`
      )
  );

  server.registerPrompt(
    "schedule_sessions",
    {
      title: "Schedule recurring sessions",
      description: "Plan and create sessions for a course over a date range.",
      argsSchema: {
        course: z.string().describe("Course template title, slug, or id"),
        range: z
          .string()
          .describe("Date range and weekly pattern in plain words"),
      },
    },
    (args) =>
      user(
        `Create sessions for "${args.course}" covering ${args.range}. Find the template with list_courses, confirm location (list_locations) and instructors (staff_directory), expand the pattern with plan_meetings, show me the proposed dates, and after I approve create each session with save_session as a draft, then ask whether to publish.`
      )
  );
}
