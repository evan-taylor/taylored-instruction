"use node";
import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { registrationStripeKey } from "../shared/registration/environment";
import {
  disputeEvidenceText,
  evidencePdf,
} from "../shared/registration/evidence";
import { api, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

function origin() {
  const url = process.env.SITE_URL;
  if (!url) {
    throw new Error("Configure SITE_URL");
  }
  return new URL(url).origin;
}

/** Admin-only: the dispute evidence PDF for one order, base64-encoded. */
export const exportEvidence = action({
  args: { orderId: v.id("registrationOrders") },
  returns: v.object({ filename: v.string(), base64: v.string() }),
  handler: async (ctx, args): Promise<{ filename: string; base64: string }> => {
    const data = await ctx.runQuery(api.registrationPolicy.evidence, args);
    if (!data) {
      throw new ConvexError("Order not found");
    }
    const pdf = await evidencePdf(data, origin());
    return {
      filename: `dispute-evidence-${args.orderId}.pdf`,
      base64: Buffer.from(pdf).toString("base64"),
    };
  },
});

/**
 * Drafts Stripe's dispute evidence from the acknowledgement: the disclosure
 * text, customer details, and the evidence PDF as the policy files. It saves
 * with submit: false, so staff review and submit in the Stripe Dashboard.
 */
export const prefillDispute = internalAction({
  args: { disputeId: v.string(), paymentIntent: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.registrationPolicy.disputeEvidence,
      {
        paymentIntent: args.paymentIntent,
      }
    );
    const text = data ? disputeEvidenceText(data, origin()) : null;
    if (!(data && text)) {
      return null;
    }
    const client = new Stripe(registrationStripeKey(), {
      apiVersion: "2026-09-30.endive",
    });
    const file = await client.files.create({
      purpose: "dispute_evidence",
      file: {
        data: Buffer.from(await evidencePdf(data, origin())),
        name: `cancellation-policy-evidence-${data.order.id}.pdf`,
        type: "application/pdf",
      },
    });
    await client.disputes.update(
      args.disputeId,
      {
        evidence: {
          ...text,
          cancellation_policy: file.id,
          refund_policy: file.id,
        },
        submit: false,
      },
      { idempotencyKey: `dispute-evidence:${args.disputeId}` }
    );
    await ctx.runMutation(internal.registrationPolicy.disputeDrafted, {
      orderId: data.order.id,
      disputeId: args.disputeId,
    });
    return null;
  },
});
