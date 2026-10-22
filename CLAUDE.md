# Project guide

Taylored Instruction is a Next.js 16 App Router site with a Convex backend,
Convex Auth (Google and six-digit email OTP), Stripe commerce, Resend email,
Sanity content, and PostHog/Sentry monitoring. Follow `AGENTS.md` for code rules.

## Commands

Use Bun 1.3.14 and Node 24 (`nvm use`).

- `bun install --frozen-lockfile`
- `bun run dev` — Next.js on port 3000
- `bunx convex dev --once` — generate types and push to the selected dev backend
- `bun run test` — Ultracite lint, TypeScript, and Vitest registration tests
- `bun run test:e2e` — Playwright against a prepared isolated fixture deployment
- `bun run build` — production frontend build, no backend deployment
- `bun run start` — serve the production build

`vercel.json` configures hosted builds through Convex. See
`docs/registration-deployment.md` for production/preview/dev setup and secret
ownership. Never assume Next.js `.env.local` variables also exist in Convex.
`.env.example` documents the frontend configuration without secret values.

## Architecture

- `app/(marketing)` — public marketing/content routes
- `app/(app)` — commerce, registration, portal, instructor, and admin routes
- `components/admin` and `components/registration` — registration UI
- `convex/schema.ts` / `convex/registrationSchema.ts` — database schemas
- `convex/registration*.ts` — registration functions, payments, jobs, and webhook
- `shared/registration` — pricing, scheduling, validation, and environment policy
- `proxy.ts` — route protection
- `app/actions` and `app/api` — Next.js email, existing eCard commerce, and CMS hooks
- `app/api/mcp`, `lib/mcp`, `convex/mcp.ts` — agent access (MCP server); see `docs/mcp.md`
- `sanity` — content schemas and CMS helpers

Supabase is legacy; do not add new Supabase tables or auth flows. Preserve Convex
Auth v1 and existing identities until the required passwordless OTP flow is supported
by a reviewed migration. Regenerate `convex/_generated` with the CLI.

## Registration

Production explicitly sets `REGISTRATION_MODE=live`; dev/preview use `test`.
Test mode refuses live keys/events and redirects registration mail to
`REGISTRATION_TEST_RECIPIENT`. Live mode validates live keys/events and sends to
intended recipients. Both payment finalizers validate amount, tax, and replay.
Hosted builds reject `REGISTRATION_ALLOW_TEST_FIXTURES=true`.

Marketing pages link to the in-house flow: `/classes`, `/courses/[slug]`, and
`/s/[code]`. Course pages embed live dates through `lib/course-catalog.ts`, which
maps each page to its registration course templates by slug and title keywords.
Never seed fixture users or enable the test password provider on shared deployments.

## Validation

Run `bun run test` and `bun run build` for dependency/runtime changes. Run relevant
Playwright scenarios for UI changes; see `docs/plans/registration-validation.md`
for fixture requirements. A passing build does not verify Stripe payment, email
delivery, or Google/OTP login. Do not send test messages to customers.
