import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Actor } from "./context";

type Session = Actor & { jwt: string; expiresAt: number };

const BEARER = /^Bearer\s+(\S+)$/iu;

export function convexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return url;
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return BEARER.exec(header)?.[1] ?? null;
}

/**
 * Turns an agent token into a Convex session. Every request exchanges again
 * so a revoked token stops working on its next call; the JWT itself is short
 * lived, which bounds how long an already-issued one remains usable.
 */
export async function authenticate(token: string): Promise<Session | null> {
  const client = new ConvexHttpClient(convexUrl());
  const result = await client.mutation(api.mcp.exchange, { token });
  if (!result) {
    return null;
  }
  return {
    jwt: result.jwt,
    expiresAt: result.expiresAt,
    userId: result.userId,
    email: result.email,
    label: result.label,
  };
}
