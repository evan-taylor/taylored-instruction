import { convexTest } from "convex-test";
import {
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  importSPKI,
  jwtVerify,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";

const modules = import.meta.glob("../../convex/**/*.ts");
const SITE = "https://example.convex.site";
const FORBIDDEN = /Forbidden/u;
const TOKEN_SHAPE = /^ti_mcp_[0-9a-f]{64}$/u;
const NOT_VALID = /Not a valid/u;
let privateKey = "";
let publicKey = "";

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = await exportPKCS8(pair.privateKey);
  publicKey = await exportSPKI(pair.publicKey);
});

afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    admin: await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    }),
    outsider: await ctx.db.insert("users", {
      email: "someone@example.test",
      emailVerificationTime: Date.now(),
    }),
  }));
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: `${ids.admin}|session-a` }),
    outsider: t.withIdentity({ subject: `${ids.outsider}|session-o` }),
  };
}

describe("agent tokens", () => {
  it("only administrators can mint tokens", async () => {
    const { admin, outsider } = await fixture();
    await expect(
      outsider.mutation(api.mcp.createToken, { label: "Nope" })
    ).rejects.toThrow(FORBIDDEN);
    const issued = await admin.mutation(api.mcp.createToken, {
      label: "Claude Code",
    });
    expect(issued.token).toMatch(TOKEN_SHAPE);
    const listed = await admin.query(api.mcp.tokens, {});
    expect(listed).toHaveLength(1);
    expect(listed[0]?.label).toBe("Claude Code");
    expect(listed[0]?.prefix).toBe(issued.token.slice(0, 15));
    expect(JSON.stringify(listed)).not.toContain(issued.token);
  });

  it("exchanges a token for a session JWT that identifies the administrator", async () => {
    vi.stubEnv("JWT_PRIVATE_KEY", privateKey);
    vi.stubEnv("CONVEX_SITE_URL", SITE);
    const { t, ids, admin } = await fixture();
    const issued = await admin.mutation(api.mcp.createToken, {
      label: "Agent",
    });
    const session = await t.mutation(api.mcp.exchange, { token: issued.token });
    expect(session).not.toBeNull();
    expect(session?.email).toBe(ADMIN_EMAILS[0]);
    expect(session?.userId).toBe(ids.admin);
    const { payload } = await jwtVerify(
      session?.jwt ?? "",
      await importSPKI(publicKey, "RS256"),
      { issuer: SITE, audience: "convex" }
    );
    const [userId, sessionId] = String(payload.sub).split("|");
    expect(userId).toBe(ids.admin);
    const stored = await t.run((ctx) => ctx.db.query("authSessions").collect());
    expect(stored.map((row) => row._id)).toContain(sessionId);
    expect(stored[0]?.userId).toBe(ids.admin);

    const asAgent = t.withIdentity({ subject: payload.sub ?? "" });
    expect(await asAgent.query(api.mcp.whoami, {})).toEqual({
      userId: ids.admin,
      email: ADMIN_EMAILS[0],
      admin: true,
    });
    const again = await t.mutation(api.mcp.exchange, { token: issued.token });
    expect(
      (await t.run((ctx) => ctx.db.query("authSessions").collect())).length
    ).toBe(1);
    expect(again?.userId).toBe(ids.admin);
    const listed = await admin.query(api.mcp.tokens, {});
    expect(listed[0]?.lastUsedAt).toBeTypeOf("number");
  });

  it("rejects unknown, malformed, revoked, and non-admin tokens", async () => {
    vi.stubEnv("JWT_PRIVATE_KEY", privateKey);
    vi.stubEnv("CONVEX_SITE_URL", SITE);
    const { t, ids, admin } = await fixture();
    expect(
      await t.mutation(api.mcp.exchange, { token: "nonsense" })
    ).toBeNull();
    expect(
      await t.mutation(api.mcp.exchange, {
        token: `ti_mcp_${"0".repeat(64)}`,
      })
    ).toBeNull();
    const issued = await admin.mutation(api.mcp.createToken, {
      label: "Agent",
    });
    expect(
      await t.mutation(api.mcp.exchange, { token: issued.token })
    ).not.toBeNull();
    await admin.mutation(api.mcp.revokeToken, { id: issued.id });
    expect(
      await t.mutation(api.mcp.exchange, { token: issued.token })
    ).toBeNull();
    expect(
      await t.run((ctx) => ctx.db.query("authSessions").collect())
    ).toEqual([]);

    const other = await admin.mutation(api.mcp.createToken, { label: "Later" });
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.admin, { email: "demoted@example.test" });
    });
    expect(
      await t.mutation(api.mcp.exchange, { token: other.token })
    ).toBeNull();
  });

  it("gives administrators the record readers the agent relies on", async () => {
    const { t, admin, outsider } = await fixture();
    const course = await t.run((ctx) =>
      ctx.db.insert("registrationCourses", {
        slug: "cpr",
        title: "CPR",
        description: "",
        delivery: "self-paced",
        publication: "published",
        settings: {
          tuition: 5000,
          materials: [],
          questions: [],
          outcomes: [],
          emails: [],
          cutoffMinutes: 0,
        },
        enrollmentOpen: true,
        revision: 1,
      })
    );
    const record = await admin.query(api.mcp.record, {
      table: "registrationCourses",
      id: course,
    });
    expect((record as { title?: string } | null)?.title).toBe("CPR");
    await expect(
      admin.query(api.mcp.record, { table: "registrationSessions", id: course })
    ).rejects.toThrow(NOT_VALID);
    await expect(
      outsider.query(api.mcp.record, {
        table: "registrationCourses",
        id: course,
      })
    ).rejects.toThrow(FORBIDDEN);
    expect(await admin.query(api.mcp.emailQueue, {})).toEqual([]);
  });
});
