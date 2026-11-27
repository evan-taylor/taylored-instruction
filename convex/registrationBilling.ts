import { ConvexError, v } from "convex/values";
import { doc } from "convex-helpers/validators";
import {
  billingCodeFields,
  billingPricing,
  billingPricingProblem,
  generateBillingCode,
  normalizeBillingCode,
} from "../shared/registration/billing";
import { formatMoney, type Quote } from "../shared/registration/domain";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { billingCodeByCode } from "./registrationBillingLedger";
import { audit, release, staff } from "./registrationHelpers";
import schema from "./schema";

const MAX_LINES = 500;
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const GENERATE_ATTEMPTS = 5;

export const billingCodes = query({
  args: { organizationId: v.id("registrationOrganizations") },
  returns: v.array(doc(schema, "registrationBillingCodes")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationBillingCodes")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(MAX_LINES);
  },
});

async function codeTaken(ctx: MutationCtx, code: string) {
  const coupon = await ctx.db
    .query("registrationCoupons")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  return Boolean(coupon) || Boolean(await billingCodeByCode(ctx, code));
}

async function newCode(ctx: MutationCtx, organizationName: string) {
  const candidates = Array.from({ length: GENERATE_ATTEMPTS }, () =>
    generateBillingCode(organizationName)
  );
  const taken = await Promise.all(candidates.map((c) => codeTaken(ctx, c)));
  const code = candidates.find((_, index) => !taken[index]);
  if (!code) {
    throw new ConvexError("Couldn't generate a unique code; enter one instead");
  }
  return code;
}

export const saveBillingCode = mutation({
  args: {
    id: v.optional(v.id("registrationBillingCodes")),
    organizationId: v.id("registrationOrganizations"),
    /** Blank generates a code. Codes cannot change once saved. */
    code: v.string(),
    pricing: billingPricing,
    amount: v.number(),
    courseIds: billingCodeFields.courseIds,
    expires: billingCodeFields.expires,
    limit: billingCodeFields.limit,
    active: v.boolean(),
  },
  returns: v.id("registrationBillingCodes"),
  handler: async (ctx, { id, ...args }) => {
    const actor = await staff(ctx);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new ConvexError("Organization not found");
    }
    const pricingProblem = billingPricingProblem(args.pricing, args.amount);
    if (pricingProblem) {
      throw new ConvexError(pricingProblem);
    }
    if (
      args.limit !== undefined &&
      (!Number.isInteger(args.limit) || args.limit < 1)
    ) {
      throw new ConvexError("Maximum uses must be a whole number above zero");
    }
    const terms = {
      pricing: args.pricing,
      amount: args.amount,
      courseIds: [...new Set(args.courseIds)],
      expires: args.expires,
      limit: args.limit,
      active: args.active,
    };
    if (id) {
      const previous = await ctx.db.get(id);
      if (previous?.organizationId !== args.organizationId) {
        throw new ConvexError("Billing code not found");
      }
      if (
        args.code.trim() &&
        args.code.trim().toUpperCase() !== previous.code
      ) {
        throw new ConvexError(
          "A code can't be renamed once saved; deactivate it and create a new one"
        );
      }
      if (terms.limit !== undefined && terms.limit < previous.uses) {
        throw new ConvexError(
          `Maximum uses can't be below the ${previous.uses} already used`
        );
      }
      await ctx.db.patch(id, terms);
      await audit(ctx, actor.userId, "billing-code-saved", id, previous.code);
      return id;
    }
    if (organization.archived) {
      throw new ConvexError("Restore the organization before adding codes");
    }
    const code = args.code.trim()
      ? normalizeBillingCode(args.code)
      : await newCode(ctx, organization.name);
    if (!code) {
      throw new ConvexError(
        "Codes are 4 to 32 letters, numbers, or dashes, starting and ending with a letter or number"
      );
    }
    if (await codeTaken(ctx, code)) {
      throw new ConvexError(
        "That code is already used by a coupon or another organization"
      );
    }
    const saved = await ctx.db.insert("registrationBillingCodes", {
      ...terms,
      organizationId: args.organizationId,
      code,
      uses: 0,
    });
    await audit(
      ctx,
      actor.userId,
      "billing-code-created",
      saved,
      `${code} for ${organization.name}`
    );
    return saved;
  },
});

export const setBillingCodeActive = mutation({
  args: { id: v.id("registrationBillingCodes"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const code = await ctx.db.get(args.id);
    if (!code) {
      throw new ConvexError("Billing code not found");
    }
    await ctx.db.patch(code._id, { active: args.active });
    await audit(
      ctx,
      actor.userId,
      args.active ? "billing-code-activated" : "billing-code-deactivated",
      code._id,
      code.code
    );
    return null;
  },
});

const balanceLine = v.object({
  ...doc(schema, "registrationOrganizationCharges").fields,
  sessionCanceled: v.boolean(),
  billingOrderStatus: v.optional(v.string()),
});

export const organizationBalance = query({
  args: { organizationId: v.id("registrationOrganizations") },
  returns: v.object({ unbilled: v.number(), lines: v.array(balanceLine) }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const rows = await ctx.db
      .query("registrationOrganizationCharges")
      .withIndex("by_organizationId_and_state", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(MAX_LINES);
    const lines = await Promise.all(
      rows.map(async (row) => {
        const [session, billingOrder] = await Promise.all([
          row.sessionId ? ctx.db.get(row.sessionId) : null,
          row.billingOrderId ? ctx.db.get(row.billingOrderId) : null,
        ]);
        return {
          ...row,
          sessionCanceled: session?.state === "canceled",
          ...(billingOrder ? { billingOrderStatus: billingOrder.status } : {}),
        };
      })
    );
    return {
      unbilled: rows
        .filter((row) => row.state === "unbilled")
        .reduce((sum, row) => sum + row.amount, 0),
      lines,
    };
  },
});

function classDate(
  line: Doc<"registrationOrganizationCharges">,
  timeZone: string
) {
  return line.classStart === undefined
    ? "self-paced"
    : new Date(line.classStart).toLocaleDateString("en-US", {
        dateStyle: "medium",
        timeZone,
      });
}

/** One invoice line per balance line, in the shape the invoice flow reads. */
async function balanceSeat(
  ctx: MutationCtx,
  line: Doc<"registrationOrganizationCharges">
): Promise<Quote> {
  const session = line.sessionId ? await ctx.db.get(line.sessionId) : null;
  const cents = Math.max(line.listPrice, line.amount);
  return {
    attendee: {
      name: line.attendeeName,
      email: line.attendeeEmail,
      selected: [],
      waived: [],
      answers: [],
    },
    lines: [
      {
        id: "tuition",
        title: `${line.title} (${classDate(line, session?.timeZone ?? DEFAULT_TIME_ZONE)}, code ${line.code})`,
        cents,
        discount: cents - line.amount,
        ...(line.taxCode ? { taxCode: line.taxCode } : {}),
      },
    ],
    total: line.amount,
    couponUsed: false,
    materials: [],
    questions: [],
  };
}

/**
 * Moves unbilled lines onto one unpaid organization order, so staff invoice
 * them with the existing invoice flow. Paying that invoice settles the order;
 * canceling it before payment puts the lines back on the balance.
 */
export const invoiceBalance = mutation({
  args: {
    organizationId: v.id("registrationOrganizations"),
    chargeIds: v.array(v.id("registrationOrganizationCharges")),
  },
  returns: v.id("registrationOrders"),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new ConvexError("Organization not found");
    }
    const ids = [...new Set(args.chargeIds)];
    if (ids.length === 0 || ids.length > MAX_LINES) {
      throw new ConvexError(`Choose between 1 and ${MAX_LINES} balance lines`);
    }
    const lines = await Promise.all(ids.map((id) => ctx.db.get(id)));
    const chosen = lines.filter(
      (line): line is Doc<"registrationOrganizationCharges"> =>
        line?.organizationId === args.organizationId &&
        line.state === "unbilled"
    );
    if (chosen.length !== ids.length) {
      throw new ConvexError(
        "Some lines are no longer unbilled. Refresh and choose again."
      );
    }
    const total = chosen.reduce((sum, line) => sum + line.amount, 0);
    const [first] = chosen;
    if (!first || total <= 0) {
      throw new ConvexError("These lines have nothing to invoice");
    }
    const seats = await Promise.all(
      chosen.map((line) => balanceSeat(ctx, line))
    );
    const now = Date.now();
    const orderId = await ctx.db.insert("registrationOrders", {
      requestKey: `organization-balance:${organization._id}:${now}`,
      purchaser: organization.contactEmail,
      purchaserName: organization.name,
      courseId: first.courseId,
      title: `${organization.name} training balance`,
      status: "unpaid",
      seats,
      total,
      currency: "usd",
      expires: now,
      couponUses: 0,
      restoredUses: 0,
      refunded: 0,
      refundReserved: 0,
      organizationId: organization._id,
      organizationBalance: true,
      pricingNote: `Billing code balance: ${chosen.length} registration${chosen.length === 1 ? "" : "s"}`,
    });
    await Promise.all(
      chosen.map((line) =>
        ctx.db.patch(line._id, { state: "invoiced", billingOrderId: orderId })
      )
    );
    await audit(
      ctx,
      actor.userId,
      "organization-balance-invoiced",
      orderId,
      `${formatMoney(total)} across ${chosen.length} lines for ${organization.name}`
    );
    return orderId;
  },
});

/** Cancels an unpaid balance order and puts its lines back on the balance. */
export const returnBalanceOrder = mutation({
  args: { orderId: v.id("registrationOrders"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new ConvexError("Reason required");
    }
    const order = await ctx.db.get(args.orderId);
    if (!order?.organizationBalance || order.status !== "unpaid") {
      throw new ConvexError(
        "Only an unpaid organization balance can be returned"
      );
    }
    await release(ctx, order, args.reason.trim());
    await audit(
      ctx,
      actor.userId,
      "organization-balance-returned",
      order._id,
      args.reason.trim()
    );
    return null;
  },
});

/** Clears the flag on a line that changed after it was invoiced. */
export const resolveFollowUp = mutation({
  args: { chargeId: v.id("registrationOrganizationCharges"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const line = await ctx.db.get(args.chargeId);
    if (!line?.followUp) {
      return null;
    }
    if (!args.note.trim()) {
      throw new ConvexError("Say how it was resolved");
    }
    await ctx.db.patch(line._id, { followUp: undefined });
    await audit(
      ctx,
      actor.userId,
      "billing-follow-up-resolved",
      line._id,
      args.note.trim()
    );
    return null;
  },
});
