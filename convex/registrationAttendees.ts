import { ConvexError, v } from "convex/values";
import { email, normalizePhone } from "../shared/registration/domain";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { audit, staff } from "./registrationHelpers";

type Contact = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | undefined;
};

/** Checkout's attendee rules, applied to a staff correction. */
function validContact(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Contact {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = `${firstName} ${lastName}`;
  if (!(firstName && lastName) || name.length > 200) {
    throw new ConvexError("Enter a first and last name");
  }
  try {
    return {
      name,
      firstName,
      lastName,
      email: email(input.email),
      phone: normalizePhone(input.phone),
    };
  } catch (error) {
    // biome-ignore lint/style/useErrorCause: ConvexError carries only the client-facing message, which is the domain error's message
    throw new ConvexError(
      error instanceof Error ? error.message : "Check the attendee details"
    );
  }
}

/** Old → new for each audited field that changed. */
function changes(seat: Doc<"registrationSeats">, next: Contact) {
  const before = seat.snapshot.attendee;
  const fields: [string, string, string][] = [
    ["first name", before.firstName ?? "", next.firstName],
    ["last name", before.lastName ?? "", next.lastName],
    ["name", seat.name, next.name],
    ["email", seat.email, next.email],
    ["phone", before.phone ?? "", next.phone ?? ""],
  ];
  return Object.fromEntries(
    fields
      .filter(([, from, to]) => from !== to)
      .map(([field, from, to]) => [
        field,
        `${from || "(none)"} → ${to || "(none)"}`,
      ])
  );
}

async function assertEmailFree(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  order: Doc<"registrationOrders">,
  next: string
) {
  if (order.seats.some((item) => item.attendee.email === next)) {
    throw new ConvexError(
      "Another attendee on this order already uses that email"
    );
  }
  const { sessionId } = seat;
  if (!sessionId || (seat.state !== "held" && seat.state !== "active")) {
    return;
  }
  const rows = await ctx.db
    .query("registrationSeats")
    .withIndex("by_sessionId_and_email", (q) =>
      q.eq("sessionId", sessionId).eq("email", next)
    )
    .take(100);
  if (rows.some((row) => row.state === "held" || row.state === "active")) {
    throw new ConvexError(
      "That email already has a registration for this session"
    );
  }
}

/**
 * Corrects an attendee's name and contact details. The seat, its snapshot,
 * the order's copy, unsent email and an unbilled organization line change
 * together; sent mail, invoices and issued certificates keep their values.
 * Portal access follows `seat.email`, so the new address gains this
 * registration and the old one loses it.
 */
export const updateContact = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!actor.admin) {
      throw new ConvexError("Only admins can edit attendee details");
    }
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new ConvexError("This registration no longer exists.");
    }
    if (seat.state === "transferred") {
      throw new ConvexError(
        "This seat was transferred. Edit the attendee on their new registration."
      );
    }
    const order = await ctx.db.get(seat.orderId);
    if (!order) {
      throw new ConvexError("Order missing");
    }
    const next = validContact(args);
    const diff = changes(seat, next);
    if (Object.keys(diff).length === 0) {
      throw new ConvexError("Nothing changed");
    }
    const emailChanged = next.email !== seat.email;
    if (emailChanged) {
      await assertEmailFree(ctx, seat, order, next.email);
    }
    const reason = args.reason?.trim();
    if (reason && reason.length > 500) {
      throw new ConvexError("Keep the reason under 500 characters");
    }
    await ctx.db.patch(seat._id, {
      name: next.name,
      email: next.email,
      snapshot: {
        ...seat.snapshot,
        attendee: { ...seat.snapshot.attendee, ...next },
      },
    });
    await ctx.db.patch(order._id, {
      seats: order.seats.map((item) =>
        item.attendee.email === seat.email
          ? { ...item, attendee: { ...item.attendee, ...next } }
          : item
      ),
    });
    if (emailChanged) {
      const pending = await ctx.db
        .query("registrationJobs")
        .withIndex("by_seatId_and_state", (q) =>
          q.eq("seatId", seat._id).eq("state", "pending")
        )
        .take(500);
      await Promise.all(
        pending
          .filter((job) => job.recipient === seat.email)
          .map((job) => ctx.db.patch(job._id, { recipient: next.email }))
      );
    }
    const charges = await ctx.db
      .query("registrationOrganizationCharges")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(20);
    await Promise.all(
      charges
        .filter((charge) => charge.state === "unbilled")
        .map((charge) =>
          ctx.db.patch(charge._id, {
            attendeeName: next.name,
            attendeeEmail: next.email,
          })
        )
    );
    await audit(
      ctx,
      actor.userId,
      "attendee-updated",
      seat._id,
      JSON.stringify({ ...diff, ...(reason ? { reason } : {}) })
    );
    return null;
  },
});
