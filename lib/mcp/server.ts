import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";
import { registerCatalogTools } from "./tools/catalog";
import { registerContentTools } from "./tools/content";
import { registerFulfillmentTools } from "./tools/fulfillment";
import { registerOverviewTools } from "./tools/overview";
import { registerPeopleTools } from "./tools/people";
import { registerRegistrationTools } from "./tools/registrations";
import { registerSalesTools } from "./tools/sales";

export const SERVER_INFO = {
  name: "taylored-instruction-admin",
  title: "Taylored Instruction Admin",
  version: "1.0.0",
} as const;

export const INSTRUCTIONS =
  "Admin workspace for Taylored Instruction, a CPR/first-aid training business. Tools mirror the admin dashboard: course templates, sessions, registrations and payments, groups and invoices, coupons, materials and keycodes, instructors, and SEO content. Read taylored://guide first. Amounts are integer cents. Tools marked destructive or that send email/charge money should be confirmed with the person when intent is unclear.";

/** Builds a server bound to one authenticated administrator. */
export function createMcpServer(ctx: McpContext) {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
  registerOverviewTools(server, ctx);
  registerCatalogTools(server, ctx);
  registerRegistrationTools(server, ctx);
  registerSalesTools(server, ctx);
  registerFulfillmentTools(server, ctx);
  registerPeopleTools(server, ctx);
  registerContentTools(server, ctx);
  registerResources(server, ctx);
  registerPrompts(server);
  return server;
}
