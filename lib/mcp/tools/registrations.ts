import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DESTRUCTIVE_EXTERNAL,
  EXTERNAL,
  errorMessage,
  formatMoney,
  type McpContext,
  ok,
  operationKey,
  READ,
  requestKey,
  run,
  WRITE,
} from "../context";
import {
  answer,
  attendee,
  email,
  id,
  pagination,
  paginationOpts,
} from "../shapes";

export function registerRegistrationTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_orders",
    {
      title: "List orders",
      description:
        "Registration orders, newest first. Status: hold (checkout in progress), unpaid (staff enrollment awaiting payment), settled, expired, exception (payment needs reconciliation). Set unpaid=true to see only orders awaiting payment.",
      inputSchema: { unpaid: z.boolean().optional(), ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.orders, {
            unpaid: args.unpaid,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "get_order",
    {
      title: "Get order",
      description:
        "An order with its seats, invoices, refunds, organization, session, course, and the emails queued for its attendees.",
      inputSchema: { orderId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.mcp.orderDetail, {
            orderId: args.orderId as Id<"registrationOrders">,
          })
        )
      )
  );

  server.registerTool(
    "lookup_customer",
    {
      title: "Look up customer",
      description:
        "Every order purchased by, and every seat registered to, an email address.",
      inputSchema: { email },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationDashboard.lookup, {
            email: args.email,
          })
        )
      )
  );

  server.registerTool(
    "enroll",
    {
      title: "Enroll attendees (staff)",
      description:
        "Creates a staff enrollment order, the same as the admin 'Enroll' and group enrollment forms. Offline and waived payments send confirmation emails immediately. payment=unpaid creates an order awaiting payment (then use request_payment_email or create_invoice); offline records payment received outside Stripe; waived grants free seats. Material ids come from the course settings (get_course); included materials are always charged, optional ones only when listed in selected, waivable ones unless listed in waived. Required course questions must be answered. Up to 100 attendees; overbook=true ignores capacity.",
      inputSchema: {
        courseId: id,
        sessionId: id.optional().describe("Omit for self-paced courses"),
        purchaser: email.describe("Who receives receipts and payment requests"),
        purchaserName: z.string().min(1),
        purchaserPhone: z.string().optional(),
        attendees: z.array(attendee).min(1).max(100),
        coupon: z.string().optional().describe("Coupon code"),
        payment: z.enum(["unpaid", "offline", "waived"]),
        reason: z
          .string()
          .min(1)
          .describe("Audit note explaining the enrollment"),
        overbook: z.boolean().default(false),
        tuitionCents: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Negotiated per-seat tuition override"),
        organizationId: id.optional(),
        pricingNote: z.string().optional(),
        operationKey,
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const result = await ctx.convex.mutation(api.registration.reserve, {
          courseId: args.courseId as Id<"registrationCourses">,
          sessionId: args.sessionId as Id<"registrationSessions"> | undefined,
          requestKey: args.operationKey ?? requestKey(),
          purchaser: args.purchaser,
          purchaserName: args.purchaserName,
          purchaserPhone: args.purchaserPhone,
          attendees: args.attendees,
          coupon: args.coupon,
          admin: {
            overbook: args.overbook,
            reason: args.reason,
            payment: args.payment,
            tuition: args.tuitionCents,
            organizationId: args.organizationId as
              | Id<"registrationOrganizations">
              | undefined,
            pricingNote: args.pricingNote,
          },
        });
        return ok(
          result,
          `Order ${result.orderId} created: ${formatMoney(result.total)} (${result.status})`
        );
      })
  );

  server.registerTool(
    "request_payment_email",
    {
      title: "Email payment request",
      description:
        "Emails the purchaser of an unpaid order a secure link to pay by card. Returns the link so you can share it directly as well.",
      inputSchema: { orderId: id, operationKey },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const url = await ctx.convex.mutation(
          api.registrationPayments.requestPayment,
          {
            orderId: args.orderId as Id<"registrationOrders">,
            requestId: args.operationKey ?? requestKey(),
          }
        );
        return ok({ url }, "Payment request queued");
      })
  );

  server.registerTool(
    "record_offline_payment",
    {
      title: "Record offline payment or waiver",
      description:
        "Marks an unpaid order as settled because payment arrived outside Stripe (check, PO, cash) or is waived. Activates seats, grants materials, and sends confirmations.",
      inputSchema: {
        orderId: id,
        source: z.enum(["offline", "waived"]),
        reason: z.string().min(1),
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.recordPayment, {
          orderId: args.orderId as Id<"registrationOrders">,
          source: args.source,
          reason: args.reason,
        });
        return ok({ settled: args.orderId });
      })
  );

  server.registerTool(
    "restore_coupon",
    {
      title: "Restore coupon uses",
      description:
        "Gives back coupon uses consumed by an order that was canceled or refunded.",
      inputSchema: { orderId: id, reason: z.string().min(1) },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.restoreCoupon, {
          orderId: args.orderId as Id<"registrationOrders">,
          reason: args.reason,
        });
        return ok({ restored: args.orderId });
      })
  );

  server.registerTool(
    "refund_order",
    {
      title: "Refund card payment",
      description:
        "Refunds part or all of a settled Stripe payment (amount in cents, tax included in the refundable balance). Pass the same operationKey when retrying so the refund is never duplicated. Records the refund, then submits it to Stripe; if Stripe is slow the refund stays pending and reconciles automatically. Seats are not canceled; use cancel_seat for that.",
      inputSchema: {
        orderId: id,
        cents: z.number().int().min(1),
        reason: z.string().min(1),
        operationKey,
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const refundId = await ctx.convex.mutation(
          api.registrationPayments.requestRefund,
          {
            orderId: args.orderId as Id<"registrationOrders">,
            cents: args.cents,
            reason: args.reason,
            key: args.operationKey ?? requestKey(),
          }
        );
        try {
          await ctx.convex.action(api.registrationExternal.refund, {
            id: refundId,
          });
        } catch (error) {
          return ok(
            {
              refundId,
              state: "pending",
              detail: error instanceof Error ? error.message : String(error),
            },
            `Refund ${formatMoney(args.cents)} recorded; Stripe confirmation pending`
          );
        }
        return ok(
          { refundId, state: "submitted" },
          `Refund of ${formatMoney(args.cents)} submitted to Stripe`
        );
      })
  );

  server.registerTool(
    "cancel_seat",
    {
      title: "Cancel registration",
      description:
        "Cancels one attendee's seat (or the whole order), releases capacity, cancels scheduled emails, and optionally notifies the attendee. Does not refund; use refund_order.",
      inputSchema: {
        seatId: id,
        reason: z.string().min(1),
        notify: z.boolean().default(true),
        cancelWholeOrder: z.boolean().default(false),
      },
      annotations: DESTRUCTIVE_EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.cancelSeat, {
          seatId: args.seatId as Id<"registrationSeats">,
          reason: args.reason,
          notify: args.notify,
          cancelWholeOrder: args.cancelWholeOrder,
        });
        return ok({ canceled: args.seatId });
      })
  );

  server.registerTool(
    "transfer_preview",
    {
      title: "Preview seat transfer",
      description:
        "Price difference and any blocker for moving a settled seat to another open session.",
      inputSchema: { seatId: id, sessionId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationTransfers.preview, {
            seatId: args.seatId as Id<"registrationSeats">,
            sessionId: args.sessionId as Id<"registrationSessions">,
          })
        )
      )
  );

  server.registerTool(
    "transfer_seat",
    {
      title: "Transfer seat",
      description:
        "Moves a settled active seat to a different open session. choice handles a price difference: collect (the increase is emailed as a payment request to the purchaser), refund (the decrease is refunded through Stripe), or keep (no money moves). Provide answers if the destination course asks required questions.",
      inputSchema: {
        seatId: id,
        sessionId: id,
        choice: z.enum(["collect", "refund", "keep"]),
        reason: z.string().min(1),
        answers: z.array(answer).optional(),
        operationKey,
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const key = args.operationKey ?? requestKey();
        const result = await ctx.convex.mutation(
          api.registrationTransfers.transfer,
          {
            seatId: args.seatId as Id<"registrationSeats">,
            sessionId: args.sessionId as Id<"registrationSessions">,
            choice: args.choice,
            reason: args.reason,
            requestKey: key,
            answers: args.answers,
          }
        );
        if (args.choice !== "collect" || result.adjustment <= 0) {
          return ok(result, "Seat transferred");
        }
        // The transfer is already saved; a payment problem must not hide it.
        try {
          const paymentUrl = await ctx.convex.mutation(
            api.registrationPayments.requestPayment,
            { orderId: result.orderId, requestId: `transfer:${key}` }
          );
          return ok(
            { ...result, paymentUrl },
            `Seat transferred; payment request for ${formatMoney(result.adjustment)} emailed`
          );
        } catch (error) {
          return ok(
            { ...result, paymentWarning: errorMessage(error) },
            `Seat transferred, but the ${formatMoney(result.adjustment)} payment request could not be emailed. Collect it with create_invoice or record_offline_payment on order ${result.orderId}.`
          );
        }
      })
  );

  server.registerTool(
    "seat_materials",
    {
      title: "Seat materials",
      description:
        "Material entitlements for a seat: PDFs, links, keycodes, and physical items with their fulfillment state.",
      inputSchema: { seatId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.seatMaterials, {
            seatId: args.seatId as Id<"registrationSeats">,
          })
        )
      )
  );

  server.registerTool(
    "resend_materials",
    {
      title: "Resend materials email",
      description: "Re-sends the attendee's materials/portal access email.",
      inputSchema: { seatId: id, operationKey },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.resendMaterials, {
          seatId: args.seatId as Id<"registrationSeats">,
          key: args.operationKey ?? requestKey(),
        });
        return ok({ queued: args.seatId });
      })
  );

  server.registerTool(
    "replace_keycode",
    {
      title: "Replace keycode",
      description:
        "Retires the keycode assigned to an entitlement and assigns a fresh one from stock, emailing the attendee.",
      inputSchema: { entitlementId: id, reason: z.string().min(1) },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.replaceCode, {
          entitlementId: args.entitlementId as Id<"registrationEntitlements">,
          reason: args.reason,
        });
        return ok({ replaced: args.entitlementId });
      })
  );

  server.registerTool(
    "fulfill_physical",
    {
      title: "Mark physical item shipped",
      description: "Marks a physical material entitlement as fulfilled.",
      inputSchema: { entitlementId: id },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.fulfillPhysical, {
          entitlementId: args.entitlementId as Id<"registrationEntitlements">,
        });
        return ok({ fulfilled: args.entitlementId });
      })
  );

  server.registerTool(
    "keycode_history",
    {
      title: "Keycode assignment history",
      description: "Every code ever assigned to an entitlement, with reasons.",
      inputSchema: { entitlementId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.assignmentHistory, {
            entitlementId: args.entitlementId as Id<"registrationEntitlements">,
          })
        )
      )
  );

  server.registerTool(
    "seat_outcomes",
    {
      title: "Seat attendance and outcomes",
      description:
        "Recorded attendance per meeting, outcome values, and the computed completion status for one seat.",
      inputSchema: { seatId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.outcomeState, {
            seatId: args.seatId as Id<"registrationSeats">,
          })
        )
      )
  );

  server.registerTool(
    "record_attendance",
    {
      title: "Record attendance",
      description:
        "Marks an attendee present, absent, or not recorded for one meeting.",
      inputSchema: {
        seatId: id,
        meetingId: z.string(),
        status: z.enum(["present", "absent", "not-recorded"]),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.attendance, {
          seatId: args.seatId as Id<"registrationSeats">,
          meetingId: args.meetingId,
          status: args.status,
        });
        return ok({
          seatId: args.seatId,
          meetingId: args.meetingId,
          status: args.status,
        });
      })
  );

  server.registerTool(
    "record_outcome",
    {
      title: "Record outcome",
      description:
        "Records a grade or result for a seat. fieldId is an outcome id from the seat's outcomeDefinitions; category outcomes take one of the options, percentage outcomes take 0–100.",
      inputSchema: {
        seatId: id,
        fieldId: z.string(),
        value: z.union([z.string(), z.number()]),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.recordOutcome, {
          seatId: args.seatId as Id<"registrationSeats">,
          fieldId: args.fieldId,
          value: args.value,
        });
        return ok({
          seatId: args.seatId,
          fieldId: args.fieldId,
          value: args.value,
        });
      })
  );

  server.registerTool(
    "override_completion",
    {
      title: "Override completion",
      description:
        "Forces a seat's completion status regardless of attendance and outcomes, with a reason.",
      inputSchema: {
        seatId: id,
        complete: z.boolean(),
        reason: z.string().min(1),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(
          api.registrationOperations.overrideCompletion,
          {
            seatId: args.seatId as Id<"registrationSeats">,
            complete: args.complete,
            reason: args.reason,
          }
        );
        return ok({ seatId: args.seatId, complete: args.complete });
      })
  );

  server.registerTool(
    "waitlist_add",
    {
      title: "Add to waitlist",
      description:
        "Adds a person to a full session's waitlist. Offers go out automatically when seats open.",
      inputSchema: { sessionId: id, name: z.string().min(1), email },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationWaitlist.join, {
          sessionId: args.sessionId as Id<"registrationSessions">,
          name: args.name,
          email: args.email,
        });
        return ok({ waitlisted: args.email });
      })
  );

  server.registerTool(
    "send_portal_access_email",
    {
      title: "Send portal access email",
      description:
        "Emails a customer a one-time link to their registration portal (schedule, materials, orders).",
      inputSchema: { email },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.action(api.registrationExternal.requestPortal, {
          email: args.email,
        });
        return ok({ sent: args.email });
      })
  );
}
