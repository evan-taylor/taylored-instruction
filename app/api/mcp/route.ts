import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ConvexHttpClient } from "convex/browser";
import { authenticate, bearerToken, convexUrl } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store" };

function unauthorized(reason: string) {
  return Response.json(
    { error: "unauthorized", reason },
    {
      status: 401,
      headers: {
        ...headers,
        "WWW-Authenticate": 'Bearer realm="Taylored Instruction MCP"',
      },
    }
  );
}

function siteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.SITE_URL ??
    new URL(request.url).origin
  );
}

/**
 * Streamable HTTP MCP endpoint. Each request is stateless: the bearer token is
 * exchanged for a Convex session, a server is built for that administrator,
 * and the request is answered as plain JSON. Server-initiated notifications
 * between requests are not supported on serverless hosting, so there is no
 * session id and no SSE stream.
 */
async function handle(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return unauthorized("Send Authorization: Bearer <agent token>");
  }
  let session: Awaited<ReturnType<typeof authenticate>>;
  try {
    session = await authenticate(token);
  } catch (error) {
    return Response.json(
      { error: "backend_unavailable", reason: String(error) },
      { status: 503, headers }
    );
  }
  if (!session) {
    return unauthorized("Agent token is invalid or revoked");
  }
  const convex = new ConvexHttpClient(convexUrl());
  convex.setAuth(session.jwt);
  const server = createMcpServer({
    convex,
    actor: {
      userId: session.userId,
      email: session.email,
      label: session.label,
    },
    siteUrl: siteUrl(request),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // Materialize each answer as JSON; nothing streams between requests here.
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return await transport.handleRequest(request);
}

export { handle as DELETE, handle as GET, handle as POST };
