import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EXTERNAL,
  type McpContext,
  ok,
  operationKey,
  READ,
  requestKey,
  run,
} from "../context";
import { email, id, pagination, paginationOpts } from "../shapes";

const TABLES = [
  "registrationCourses",
  "registrationSessions",
  "registrationSeats",
  "registrationOrders",
  "registrationCoupons",
  "registrationOrganizations",
  "registrationGroupRequests",
  "registrationInvoices",
  "registrationMaterials",
  "registrationLocations",
  "registrationEntitlements",
  "registrationRefunds",
  "registrationJobs",
  "registrationCodes",
  "registrationWaitlist",
  "registrationSessionFiles",
  "seo_pages",
  "profiles",
  "users",
] as const;

export function registerOverviewTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "The administrator this agent session acts as, and the token label in use.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok({
          ...(await ctx.convex.query(api.mcp.whoami, {})),
          tokenLabel: ctx.actor.label,
          siteUrl: ctx.siteUrl,
        })
      )
  );

  server.registerTool(
    "dashboard_summary",
    {
      title: "Dashboard summary",
      description:
        "The admin dashboard: 30-day revenue and seats sold, upcoming sessions and fill, unpaid orders, open and overdue invoices, new group requests, failed emails, pending refunds, payment exceptions, low keycode stock, next sessions, recent orders, and recent activity.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.registrationDashboard.summary, {}))
      )
  );

  server.registerTool(
    "attention_queue",
    {
      title: "Items needing attention",
      description:
        "Failed emails, unpaid orders, payment exceptions, pending refunds, overdue invoices, and new group requests. This is the 'Activity & attention' badge in the admin sidebar.",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.query(api.registrationOperations.attention, {}))
      )
  );

  server.registerTool(
    "activity_log",
    {
      title: "Activity log",
      description: "Audit trail of staff and system actions, newest first.",
      inputSchema: pagination,
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.activity, {
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "email_queue",
    {
      title: "Email queue",
      description: "Emails pending or in flight, oldest first.",
      inputSchema: { limit: z.number().int().min(1).max(200).optional() },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(await ctx.convex.query(api.mcp.emailQueue, { limit: args.limit }))
      )
  );

  server.registerTool(
    "retry_email",
    {
      title: "Retry failed email",
      description: "Re-queues a failed email job.",
      inputSchema: { jobId: id },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.retryEmail, {
          id: args.jobId as Id<"registrationJobs">,
        });
        return ok({ retried: args.jobId });
      })
  );

  server.registerTool(
    "send_test_email",
    {
      title: "Send test email",
      description:
        "Sends a plain-text email through the registration mailer to the configured safe test recipient only.",
      inputSchema: {
        recipient: email,
        subject: z.string().min(1),
        body: z.string().min(1),
        operationKey,
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.testEmail, {
          recipient: args.recipient,
          subject: args.subject,
          body: args.body,
          key: args.operationKey ?? requestKey(),
        });
        return ok({ queued: args.recipient });
      })
  );

  server.registerTool(
    "get_record",
    {
      title: "Get any record",
      description:
        "Reads one document by table and id. Useful for seats, entitlements, refunds, jobs, codes, and anything not covered by a dedicated tool.",
      inputSchema: { table: z.enum(TABLES), id },
      annotations: READ,
    },
    (args) => run(async () => ok(await ctx.convex.query(api.mcp.record, args)))
  );

  server.registerTool(
    "offering_detail",
    {
      title: "Public offering detail",
      description:
        "What a customer sees for one session code (/s/<code>) or self-paced course slug: pricing, materials, questions, availability.",
      inputSchema: { code: z.string().optional(), slug: z.string().optional() },
      annotations: READ,
    },
    (args) =>
      run(async () => ok(await ctx.convex.query(api.registration.detail, args)))
  );
}
