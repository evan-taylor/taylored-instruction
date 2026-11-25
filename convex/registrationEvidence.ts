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
 * Each attempt's outcome lands on the dispute row, which retries failures.
 */
export const prefillDispute = internalAction({
  args: { disputeId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const dispute = await ctx.runQuery(internal.registrationDisputes.get, args);
    if (dispute?.state !== "pending") {
      return null;
    }
    try {
      const data = await ctx.runQuery(
        internal.registrationPolicy.disputeEvidence,
        { paymentIntent: dispute.paymentIntent }
      );
      if (!data) {
        throw new Error("No order is linked to this payment yet");
      }
      const text = disputeEvidenceText(data, origin());
      if (!text) {
        await ctx.runMutation(internal.registrationDisputes.result, {
          disputeId: args.disputeId,
          outcome: "no-evidence",
        });
        return null;
      }
      const client = new Stripe(registrationStripeKey(), {
        apiVersion: "2026-09-30.endive",
      });
      let { fileId } = dispute;
      if (!fileId) {
        const file = await client.files.create({
          purpose: "dispute_evidence",
          file: {
            data: Buffer.from(await evidencePdf(data, origin())),
            name: `cancellation-policy-evidence-${data.order.id}.pdf`,
            type: "application/pdf",
          },
        });
        fileId = file.id;
        await ctx.runMutation(internal.registrationDisputes.fileUploaded, {
          disputeId: args.disputeId,
          fileId,
        });
      }
      await client.disputes.update(
        args.disputeId,
        {
          evidence: {
            ...text,
            cancellation_policy: fileId,
            refund_policy: fileId,
          },
          submit: false,
        },
        {
          idempotencyKey: `dispute-evidence:${args.disputeId}:${dispute.attempts}`,
        }
      );
      await ctx.runMutation(internal.registrationDisputes.result, {
        disputeId: args.disputeId,
        outcome: "drafted",
      });
    } catch (error) {
      await ctx.runMutation(internal.registrationDisputes.result, {
        disputeId: args.disputeId,
        outcome: "error",
        error:
          error instanceof Error
            ? error.message
            : "Dispute evidence draft failed",
      });
    }
    return null;
  },
});
