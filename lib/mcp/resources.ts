import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { McpContext } from "./context";

const JSON_TYPE = "application/json";

function json(uri: string, data: unknown) {
  return {
    contents: [
      { uri, mimeType: JSON_TYPE, text: JSON.stringify(data, null, 2) },
    ],
  };
}

export const GUIDE = `# Running Taylored Instruction from an agent

## Vocabulary
- Course template: a product (scheduled class or self-paced course) with settings: tuition, materials, intake questions, outcomes, automated emails, enrollment cutoff.
- Session: a dated run of a scheduled template with meetings, capacity, instructors, and optional overrides. Customers register at /s/<code>.
- Order: one purchase holding one or more seats. Status hold → settled (card) or unpaid → settled (offline/invoice). expired and exception need attention.
- Seat: one attendee in an order. States: held, active, canceled, transferred.
- Entitlement: a material granted to a seat (pdf, link, keycode, physical).
- Invoice: a Stripe-hosted or offline invoice for an unpaid order, usually for organizations.

## Daily rhythm
1. dashboard_summary and attention_queue.
2. Retry failed emails (retry_email), reconcile payment exceptions (get_order, record_offline_payment or refund_order), chase overdue invoices (remind_invoice).
3. Reply to new group requests: update_group_request, save_organization, enroll with payment=unpaid, then create_invoice or request_payment_email.
4. Before class: session_overview, session_roster, export_roster_csv, email_attendees for reminders.
5. After class: record_attendance, record_outcome, override_completion when needed.

## Email editing
- Read get_course first. Use save_course with settings.confirmationEmail (subject and body) to edit the automatic registration confirmation, or settings.emails to edit scheduled messages. Omitted fields are preserved; supplied email arrays replace the complete array, so retain other steps and their ids.
- Use save_session with overrides.confirmationEmail or overrides.emails for one session. clearOverrides: ["confirmationEmail"] restores inheritance from the course.
- Bodies use Markdown: **bold**, *italic*, ++underline++, [label](https://...), - bullets, and 1. numbered items. Indent nested list items four spaces. Raw HTML is displayed as text.
- Merge fields: {{attendeeName}}, {{courseTitle}}, {{meetingDates}}, {{materials}}, {{portalLink}}. Schedule, materials, and portal access are appended automatically.
- Confirmation edits apply to future queued confirmations, not already queued or sent mail. send_test_email accepts the same formatting; supply sample values in place of merge fields for standalone test messages.

## Money
- Amounts are integer cents. Tuition is pre-tax; Stripe Tax adds tax at checkout and on invoices.
- refund_order moves money; cancel_seat frees the seat. They are independent.
- Test mode (dev/preview) uses Stripe test keys and redirects all mail to the tester mailbox; live mode is production only.

## Safety
- Every action is audited under the administrator who created the token.
- Prefer reading (get_order, session_overview) before writing. Confirm destructive actions with the person when the request is ambiguous.
`;

export function registerResources(server: McpServer, ctx: McpContext) {
  server.registerResource(
    "guide",
    "taylored://guide",
    {
      title: "Operations guide",
      description:
        "How the registration business fits together and the daily routine.",
      mimeType: "text/markdown",
    },
    async (uri) =>
      await Promise.resolve({
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: GUIDE }],
      })
  );

  server.registerResource(
    "dashboard",
    "taylored://dashboard",
    {
      title: "Dashboard summary",
      description: "Live admin dashboard numbers.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(
        uri.href,
        await ctx.convex.query(api.registrationDashboard.summary, {})
      )
  );

  server.registerResource(
    "attention",
    "taylored://attention",
    {
      title: "Needs attention",
      description:
        "Failed emails, unpaid orders, exceptions, refunds, overdue invoices, new requests.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(
        uri.href,
        await ctx.convex.query(api.registrationOperations.attention, {})
      )
  );

  server.registerResource(
    "courses",
    "taylored://courses",
    {
      title: "Course templates",
      description: "First 100 course templates with settings.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(
        uri.href,
        await ctx.convex.query(api.registration.courses, {
          paginationOpts: { cursor: null, numItems: 100 },
        })
      )
  );

  server.registerResource(
    "upcoming",
    "taylored://sessions/upcoming",
    {
      title: "Upcoming public classes",
      description: "What the public /classes page lists right now.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(uri.href, await ctx.convex.query(api.registration.publicCatalog, {}))
  );

  server.registerResource(
    "locations",
    "taylored://locations",
    {
      title: "Locations",
      description: "Saved training locations.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(
        uri.href,
        await ctx.convex.query(api.registrationOperations.locations, {})
      )
  );

  server.registerResource(
    "staff",
    "taylored://staff",
    {
      title: "Approved instructors",
      description: "Assignable instructors.",
      mimeType: JSON_TYPE,
    },
    async (uri) =>
      json(
        uri.href,
        await ctx.convex.query(api.registrationOperations.staffDirectory, {})
      )
  );

  server.registerResource(
    "session",
    new ResourceTemplate("taylored://sessions/{sessionId}", {
      list: undefined,
    }),
    {
      title: "Session overview",
      description:
        "Session, course, seat counts, waitlist, instructors, files.",
      mimeType: JSON_TYPE,
    },
    async (uri, variables) =>
      json(
        uri.href,
        await ctx.convex.query(api.mcp.sessionOverview, {
          sessionId: String(variables.sessionId) as Id<"registrationSessions">,
        })
      )
  );

  server.registerResource(
    "roster-csv",
    new ResourceTemplate("taylored://sessions/{sessionId}/roster.csv", {
      list: undefined,
    }),
    {
      title: "Roster CSV",
      description: "First 200 roster rows as CSV.",
      mimeType: "text/csv",
    },
    async (uri, variables) => {
      const page = await ctx.convex.query(
        api.registrationOperations.exportRoster,
        {
          sessionId: String(variables.sessionId) as Id<"registrationSessions">,
          paginationOpts: { cursor: null, numItems: 200 },
        }
      );
      return {
        contents: [{ uri: uri.href, mimeType: "text/csv", text: page.csv }],
      };
    }
  );

  server.registerResource(
    "order",
    new ResourceTemplate("taylored://orders/{orderId}", { list: undefined }),
    {
      title: "Order detail",
      description: "Order with seats, invoices, refunds, and emails.",
      mimeType: JSON_TYPE,
    },
    async (uri, variables) =>
      json(
        uri.href,
        await ctx.convex.query(api.mcp.orderDetail, {
          orderId: String(variables.orderId) as Id<"registrationOrders">,
        })
      )
  );
}
