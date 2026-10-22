import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  fill,
  type McpContext,
  ok,
  READ,
  run,
  UPSERT,
  WRITE,
} from "../context";
import { id, materialKind, pagination, paginationOpts } from "../shapes";

type MaterialDoc = Doc<"registrationMaterials">;
type MaterialArgs = {
  title?: string;
  kind?: MaterialDoc["kind"];
  summary?: string;
  instructions?: string;
  url?: string;
  pdfBase64?: string;
  archived?: boolean;
  taxCode?: string;
};

/** Validates a create-or-update request before any file is uploaded. */
function materialInput(previous: MaterialDoc | null, args: MaterialArgs) {
  const value = fill(
    {
      title: "",
      kind: undefined as MaterialDoc["kind"] | undefined,
      summary: undefined as string | undefined,
      instructions: undefined as string | undefined,
      url: undefined as string | undefined,
      archived: false,
      taxCode: undefined as string | undefined,
    },
    previous,
    args
  );
  const { kind } = value;
  if (!(value.title && kind)) {
    throw new Error("New materials need a title and kind");
  }
  if (previous && previous.kind !== kind) {
    throw new Error("A material's kind cannot change; create a new one");
  }
  if (args.pdfBase64 && kind !== "pdf") {
    throw new Error("pdfBase64 only applies to pdf materials");
  }
  return { ...value, kind };
}

async function uploadPdf(ctx: McpContext, base64: string) {
  const bytes = Buffer.from(base64, "base64");
  const uploadUrl = await ctx.convex.mutation(
    api.registrationOperations.uploadUrl,
    {}
  );
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(`PDF upload failed with status ${response.status}`);
  }
  const { storageId } = (await response.json()) as {
    storageId: Id<"_storage">;
  };
  return storageId;
}

export function registerFulfillmentTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_materials",
    {
      title: "List materials",
      description:
        "Course materials: PDFs, links, keycode pools, and physical items, with stock counts for keycodes.",
      inputSchema: pagination,
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.materials, {
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "save_material",
    {
      title: "Create or update material",
      description:
        "Creates a material or merges fields into an existing one. kind: pdf (provide pdfBase64 to upload a new version), link (url), keycode (stock added with add_keycodes), physical (shipped by hand). Saving a changed PDF creates a new version; earlier recipients keep theirs.",
      inputSchema: {
        id: id.optional(),
        title: z.string().min(1).optional(),
        kind: materialKind.optional(),
        summary: z.string().optional(),
        instructions: z.string().optional(),
        url: z.string().url().optional(),
        pdfBase64: z.string().optional(),
        archived: z.boolean().optional(),
        taxCode: z.string().optional(),
      },
      annotations: UPSERT,
    },
    (args) =>
      run(async () => {
        const previous = args.id
          ? ((await ctx.convex.query(api.mcp.record, {
              table: "registrationMaterials",
              id: args.id,
            })) as Doc<"registrationMaterials"> | null)
          : null;
        if (args.id && !previous) {
          throw new Error("Material not found");
        }
        const { title, kind, ...value } = materialInput(previous, args);
        const storageId = args.pdfBase64
          ? await uploadPdf(ctx, args.pdfBase64)
          : previous?.storageId;
        const saved = await ctx.convex.mutation(
          api.registrationOperations.saveMaterial,
          { id: previous?._id, ...value, title, kind, storageId }
        );
        return ok(
          { id: saved, title, kind },
          previous ? "Material updated" : "Material created"
        );
      })
  );

  server.registerTool(
    "keycode_stock",
    {
      title: "Keycode stock",
      description: "Codes in a keycode material's pool, filterable by state.",
      inputSchema: {
        materialId: id,
        state: z.enum(["available", "assigned", "retired"]).optional(),
        ...pagination,
      },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.stock, {
            materialId: args.materialId as Id<"registrationMaterials">,
            state: args.state,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "add_keycodes",
    {
      title: "Add keycodes to stock",
      description:
        "Adds code URLs (one per line, up to 200) to a keycode material. preview=true validates without saving and reports invalid lines and duplicates. New stock automatically fills waiting entitlements.",
      inputSchema: {
        materialId: id,
        input: z.string().min(1),
        preview: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.mutation(api.registrationOperations.addStock, {
            materialId: args.materialId as Id<"registrationMaterials">,
            input: args.input,
            preview: args.preview,
          })
        )
      )
  );

  server.registerTool(
    "missing_materials",
    {
      title: "Entitlements waiting on stock",
      description:
        "Paid entitlements for a material that could not be fulfilled yet (for example an empty keycode pool).",
      inputSchema: { materialId: id, ...pagination },
      annotations: READ,
    },
    (args) =>
      run(async () =>
        ok(
          await ctx.convex.query(api.registrationOperations.missingMaterials, {
            materialId: args.materialId as Id<"registrationMaterials">,
            paginationOpts: paginationOpts(args),
          })
        )
      )
  );

  server.registerTool(
    "manage_keycode",
    {
      title: "Retire or assign a keycode",
      description:
        "Retires an available code, or assigns an available code directly to a pending entitlement.",
      inputSchema: {
        codeId: id,
        entitlementId: id.optional(),
        reason: z.string().min(1),
      },
      annotations: WRITE,
    },
    (args) =>
      run(async () => {
        await ctx.convex.mutation(api.registrationOperations.manageCode, {
          codeId: args.codeId as Id<"registrationCodes">,
          entitlementId: args.entitlementId as
            | Id<"registrationEntitlements">
            | undefined,
          reason: args.reason,
        });
        return ok({
          codeId: args.codeId,
          entitlementId: args.entitlementId ?? null,
        });
      })
  );
}
