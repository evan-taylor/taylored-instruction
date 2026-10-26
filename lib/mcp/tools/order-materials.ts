import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DESTRUCTIVE,
  DESTRUCTIVE_EXTERNAL,
  type McpContext,
  ok,
  operationKey,
  READ,
  requestKey,
  run,
} from "../context";
import { id } from "../shapes";

export function registerOrderMaterialTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "order_material_selection",
    {
      title: "Read attendee material selection",
      description:
        "Returns the current material selection, orderId, and revision together. Read before edit_order_materials; retain all wanted materialIds and pass this revision to reject stale edits.",
      inputSchema: { seatId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(
            api.registrationMaterialOrders.selectionState,
            { seatId: args.seatId as Id<"registrationSeats"> }
          )
        )
      )
  );
  server.registerTool(
    "order_material_balances",
    {
      title: "List material balances",
      description:
        "Lists balances linked to an original order. Each balance has its own payment, invoice, and refund controls; use get_order on its ID for those records.",
      inputSchema: { orderId: id },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationMaterialOrders.additions, {
            orderId: args.orderId as Id<"registrationOrders">,
          })
        )
      )
  );
  server.registerTool(
    "edit_order_materials",
    {
      title: "Edit attendee materials",
      description:
        "Replaces the complete material selection for one attendee, including removing included materials. Requires the revision from order_material_selection and a reason. Unpaid orders recalculate; paid additions create an unpaid material balance without reserving another seat. Saving never sends an invoice or issues a refund. Removed materials lose portal access and pending delivery. Use create_invoice with send=false to draft a balance invoice, then issue_invoice only when instructed; refund_order is separate. Settle unpaid transfers first. Unpaid coupons/card checkouts require re-enrollment; void draft/open invoices before editing. Resolve pending balances first.",
      inputSchema: {
        seatId: id,
        materialIds: z
          .array(id)
          .max(50)
          .describe("All desired catalog material IDs; [] removes all"),
        revision: z.number().int().min(0),
        reason: z.string().min(1),
        operationKey,
      },
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        const balanceId = await ctx.convex.mutation(
          api.registrationMaterialOrders.edit,
          {
            seatId: args.seatId as Id<"registrationSeats">,
            materialIds: args.materialIds as Id<"registrationMaterials">[],
            revision: args.revision,
            reason: args.reason,
            requestKey: args.operationKey ?? requestKey(),
          }
        );
        return ok(
          { balanceId },
          "Materials saved. No invoice sent or refund issued."
        );
      })
  );
  server.registerTool(
    "cancel_material_balance",
    {
      title: "Cancel unpaid material balance",
      description:
        "Cancels an unpaid material addition and voids its invoice. The attendee registration remains active. This does not issue a refund.",
      inputSchema: { orderId: id, reason: z.string().min(1) },
      annotations: DESTRUCTIVE_EXTERNAL,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(
          api.registrationMaterialOrders.cancelAddition,
          {
            orderId: args.orderId as Id<"registrationOrders">,
            reason: args.reason,
          }
        );
        return ok({ canceled: args.orderId });
      })
  );
}
