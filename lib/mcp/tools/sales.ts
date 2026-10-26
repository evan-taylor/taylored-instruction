import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  DESTRUCTIVE_EXTERNAL,
  EXTERNAL,
  errorMessage,
  fill,
  type McpContext,
  ok,
  READ,
  run,
  UPSERT,
} from "../context";
import {
  email,
  groupStatus,
  id,
  instant,
  invoiceStatus,
  pagination,
  paginationOpts,
  postalAddress,
  toEpoch,
} from "../shapes";

const INVOICE_TERMS_DAYS = 30;

export function registerSalesTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_coupons",
    {
      title: "List coupons",
      description:
        "Discount codes with type, amount, scope, expiry, limits, and usage counts.",
      inputSchema: pagination,
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registration.coupons, {
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "save_coupon",
    {
      title: "Create or update coupon",
      description:
        "Creates a coupon or merges fields into an existing one. percent amounts are whole percents; fixed amounts are cents per seat. Scope: tuition only by default, allMaterials=true for tuition plus every material, or materialIds for specific materials. courseIds limits the coupon to templates (empty = any).",
      inputSchema: {
        id: id.optional(),
        code: z.string().min(1).optional(),
        type: z.enum(["percent", "fixed"]).optional(),
        amount: z.number().int().min(0).optional(),
        materialIds: z.array(id).optional(),
        allMaterials: z.boolean().optional(),
        courseIds: z.array(id).optional(),
        expires: instant.optional(),
        limit: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Total uses allowed"),
        disabled: z.boolean().optional(),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () => {
        const previous = args.id
          ? ((await ctx.convex.query(api.mcp.record, {
              table: "registrationCoupons",
              id: args.id,
            })) as Doc<"registrationCoupons"> | null)
          : null;
        if (args.id && !previous) {
          throw new Error("Coupon not found");
        }
        const expires =
          args.expires === undefined ? undefined : toEpoch(args.expires);
        const value = fill(
          {
            code: "",
            type: "percent" as Doc<"registrationCoupons">["type"],
            amount: -1,
            materialIds: [] as Id<"registrationMaterials">[],
            allMaterials: false,
            courseIds: [] as Id<"registrationCourses">[],
            expires: -1,
            limit: 0,
            reserved: 0,
            consumed: 0,
            disabled: false,
          },
          previous,
          {
            code: args.code,
            type: args.type,
            amount: args.amount,
            materialIds: args.materialIds as
              | Id<"registrationMaterials">[]
              | undefined,
            allMaterials: args.allMaterials,
            courseIds: args.courseIds as
              | Id<"registrationCourses">[]
              | undefined,
            expires,
            limit: args.limit,
            disabled: args.disabled,
          }
        );
        if (!value.code || value.amount < 0 || value.expires < 0) {
          throw new Error("New coupons need code, amount, and expires");
        }
        const { code } = value;
        const saved = await ctx.convex.mutation(api.registration.saveCoupon, {
          id: previous?._id,
          ...value,
        });
        return ok(
          { id: saved, code },
          previous ? "Coupon updated" : "Coupon created"
        );
      })
  );

  server.registerTool(
    "list_group_requests",
    {
      title: "List group training requests",
      description:
        "Inbound group training inquiries from the website with status and internal notes.",
      inputSchema: { status: groupStatus.optional(), ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationGroups.groupRequests, {
            status: args.status,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "update_group_request",
    {
      title: "Update group request",
      description:
        "Updates a group request in one step. Only the fields given change; notes, organization, and order links are kept unless supplied (null unlinks).",
      inputSchema: {
        id,
        status: groupStatus.optional(),
        internalNotes: z
          .string()
          .optional()
          .describe("Replaces the stored notes; omitted notes are kept"),
        organizationId: id
          .nullable()
          .optional()
          .describe("Link an organization; null unlinks; omitted keeps"),
        orderId: id
          .nullable()
          .optional()
          .describe(
            "Link the order created for it; null unlinks; omitted keeps"
          ),
      },
      annotations: { ...UPSERT, idempotentHint: true },
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.mcp.patchGroupRequest, {
          id: args.id as Id<"registrationGroupRequests">,
          status: args.status,
          internalNotes: args.internalNotes,
          organizationId: args.organizationId as
            | Id<"registrationOrganizations">
            | null
            | undefined,
          orderId: args.orderId as Id<"registrationOrders"> | null | undefined,
        });
        return ok({ id: args.id, status: args.status ?? "unchanged" });
      })
  );

  server.registerTool(
    "list_organizations",
    {
      title: "List organizations",
      description:
        "Group customers (employers, agencies) with billing contacts.",
      inputSchema: pagination,
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationGroups.organizations, {
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "save_organization",
    {
      title: "Create or update organization",
      description:
        "Creates an organization or merges fields into an existing one.",
      inputSchema: {
        id: id.optional(),
        name: z.string().min(1).optional(),
        contactName: z.string().optional(),
        contactEmail: email.optional(),
        phone: z.string().optional(),
        address: z.string().optional().describe("Street address line"),
        ...postalAddress,
        notes: z.string().optional(),
        archived: z.boolean().optional(),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () => {
        const previous = args.id
          ? ((await ctx.convex.query(api.mcp.record, {
              table: "registrationOrganizations",
              id: args.id,
            })) as Doc<"registrationOrganizations"> | null)
          : null;
        if (args.id && !previous) {
          throw new Error("Organization not found");
        }
        const value = fill(
          {
            name: "",
            contactName: "",
            contactEmail: "",
            phone: "",
            address: "",
            city: undefined as string | undefined,
            state: undefined as string | undefined,
            postalCode: undefined as string | undefined,
            country: undefined as string | undefined,
            notes: "",
            archived: false,
          },
          previous,
          args
        );
        if (!value.name) {
          throw new Error("name is required");
        }
        const { name } = value;
        const saved = await ctx.convex.mutation(
          api.registrationGroups.saveOrganization,
          { id: previous?._id, ...value }
        );
        return ok({ id: saved, name });
      })
  );

  server.registerTool(
    "organization_orders",
    {
      title: "Organization orders",
      description: "Orders placed for one organization.",
      inputSchema: { organizationId: id, ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationGroups.organizationOrders, {
            id: args.organizationId as Id<"registrationOrganizations">,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description:
        "Invoices with their orders. draft = created locally, open = sent via Stripe and awaiting payment, paid, void.",
      inputSchema: { status: invoiceStatus.optional(), ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationGroups.invoices, {
            status: args.status,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create invoice",
      description:
        "Creates a draft invoice for an unpaid registration order or linked material balance. With explicit send=true it is also issued through Stripe, which emails the hosted invoice and returns its payment URL. Sales tax is computed by Stripe Tax from the billing address.",
      inputSchema: {
        orderId: id,
        billToName: z.string().min(1),
        billToEmail: email,
        billToAddress: z.string().default(""),
        ...postalAddress,
        poNumber: z.string().default(""),
        notes: z.string().default(""),
        dueDays: z.number().int().min(1).default(INVOICE_TERMS_DAYS),
        organizationId: id.optional(),
        send: z.boolean().default(false),
      },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        const invoiceId = await ctx.convex.mutation(
          api.registrationGroups.createInvoice,
          {
            orderId: args.orderId as Id<"registrationOrders">,
            billToName: args.billToName,
            billToEmail: args.billToEmail,
            billToAddress: args.billToAddress,
            city: args.city,
            state: args.state,
            postalCode: args.postalCode,
            country: args.country,
            poNumber: args.poNumber,
            notes: args.notes,
            dueDays: args.dueDays,
            organizationId: args.organizationId as
              | Id<"registrationOrganizations">
              | undefined,
          }
        );
        if (!args.send) {
          return ok({ invoiceId, status: "draft" }, "Draft invoice created");
        }
        try {
          const hostedUrl = await ctx.convex.action(
            api.registrationInvoiceActions.issue,
            { id: invoiceId }
          );
          return ok({ invoiceId, hostedUrl }, "Invoice issued through Stripe");
        } catch (error) {
          return ok(
            { invoiceId, status: "draft", error: errorMessage(error) },
            `Invoice ${invoiceId} was saved as a draft but Stripe could not issue it. Fix the problem and call issue_invoice.`
          );
        }
      })
  );

  server.registerTool(
    "issue_invoice",
    {
      title: "Issue invoice via Stripe",
      description:
        "Sends a draft invoice through Stripe (or retries a failed send) and returns the hosted payment URL.",
      inputSchema: { invoiceId: id },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () =>
        ok(
          {
            hostedUrl: await ctx.convex.action(
              api.registrationInvoiceActions.issue,
              { id: args.invoiceId as Id<"registrationInvoices"> }
            ),
          },
          "Invoice issued"
        )
      )
  );

  server.registerTool(
    "record_invoice_payment",
    {
      title: "Record invoice paid offline",
      description:
        "Marks an invoice paid by check, ACH, or PO, settles the order, and voids the Stripe copy.",
      inputSchema: { invoiceId: id, reason: z.string().min(1) },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationGroups.recordInvoicePayment, {
          id: args.invoiceId as Id<"registrationInvoices">,
          reason: args.reason,
        });
        return ok({ paid: args.invoiceId });
      })
  );

  server.registerTool(
    "void_invoice",
    {
      title: "Void invoice",
      description: "Voids an invoice locally and in Stripe.",
      inputSchema: { invoiceId: id, reason: z.string().min(1) },
      annotations: DESTRUCTIVE_EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationGroups.voidInvoice, {
          id: args.invoiceId as Id<"registrationInvoices">,
          reason: args.reason,
        });
        return ok({ voided: args.invoiceId });
      })
  );

  server.registerTool(
    "remind_invoice",
    {
      title: "Send invoice reminder",
      description: "Emails a payment reminder for an open invoice.",
      inputSchema: { invoiceId: id },
      annotations: EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationGroups.remindInvoice, {
          id: args.invoiceId as Id<"registrationInvoices">,
        });
        return ok({ reminded: args.invoiceId });
      })
  );

  server.registerTool(
    "stripe_tax_codes",
    {
      title: "Stripe tax codes",
      description:
        "Tax codes available for tuition and materials (for example txcd_20030000 for training).",
      annotations: READ,
    },
    () =>
      run(async () =>
        ok(await ctx.convex.action(api.registrationInvoiceActions.taxCodes, {}))
      )
  );
}
