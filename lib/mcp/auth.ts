import { createHash } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Actor } from "./context";

type Session = Actor & { jwt: string; expiresAt: number };

/** Exchanged sessions, keyed by token digest; lives as long as the server instance. */
const sessions = new Map<string, Session>();
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
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

/** Turns an agent token into a Convex session, reusing a cached JWT when fresh. */
export async function authenticate(token: string): Promise<Session | null> {
  const digest = createHash("sha256").update(token).digest("hex");
  const cached = sessions.get(digest);
  if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return cached;
  }
  const client = new ConvexHttpClient(convexUrl());
  const result = await client.mutation(api.mcp.exchange, { token });
  if (!result) {
    sessions.delete(digest);
    return null;
  }
  const session = {
    jwt: result.jwt,
    expiresAt: result.expiresAt,
    userId: result.userId,
    email: result.email,
    label: result.label,
  };
  sessions.set(digest, session);
  return session;
}

export function forgetSession(token: string) {
  sessions.delete(createHash("sha256").update(token).digest("hex"));
}
