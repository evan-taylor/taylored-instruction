import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { z } from "zod";

export type Actor = { userId: string; email: string; label: string };
export type McpContext = {
  convex: ConvexHttpClient;
  actor: Actor;
  /** Public site origin, used to build links an agent can hand to people. */
  siteUrl: string;
};

const ERROR_PREFIX = /^(Error|ConvexError):\s*/u;

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return typeof error.data === "string"
      ? error.data
      : JSON.stringify(error.data);
  }
  if (error instanceof Error) {
    return error.message.replace(ERROR_PREFIX, "");
  }
  return String(error);
}

/** Successful tool result: a readable text block plus the raw data. */
export function ok(data: unknown, summary?: string): CallToolResult {
  const text =
    typeof data === "string" ? data : JSON.stringify(data ?? null, null, 2);
  return {
    content: [{ type: "text", text: summary ? `${summary}\n\n${text}` : text }],
    structuredContent:
      data !== null && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : { result: data ?? null },
  };
}

export function fail(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: errorMessage(error) }],
  };
}

/** Runs a tool body and converts thrown errors into MCP error results. */
export async function run(
  body: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await body();
  } catch (error) {
    return fail(error);
  }
}

export const READ = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
/** Creates when no id is given, so repeating the same input is not safe. */
export const UPSERT = { ...WRITE, idempotentHint: false } as const;
export const DESTRUCTIVE = { ...WRITE, destructiveHint: true } as const;
/** Sends mail or moves money through Stripe or Resend. */
export const EXTERNAL = { ...WRITE, openWorldHint: true } as const;
/** Removes or cancels data and also notifies people or touches Stripe. */
export const DESTRUCTIVE_EXTERNAL = {
  ...DESTRUCTIVE,
  openWorldHint: true,
} as const;

export function requestKey() {
  return crypto.randomUUID();
}

/** Caller-supplied idempotency key, so a retried call is recognized as the same operation. */
export const operationKey = z
  .string()
  .min(24)
  .max(100)
  .optional()
  .describe(
    "Idempotency key (24–100 chars). Reuse the same value when retrying after a lost response; generated when omitted."
  );

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Layers a partial update over the stored record and defaults, field by field,
 * so tools can accept partial input for update-or-create mutations.
 */
export function fill<T extends object>(
  defaults: T,
  previous: Partial<T> | null | undefined,
  patch: Partial<T>
): T {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const next = patch[key] ?? previous?.[key];
    if (next !== undefined) {
      result[key] = next as T[keyof T];
    }
  }
  return result;
}
