# Registration deployment

Use Bun 1.3.14 and Node 24 (`nvm use`). Install with `bun install --frozen-lockfile`.
`bun run test` runs lint, TypeScript, and registration behavior tests. `bun run build`
builds Next.js without deploying Convex. `vercel.json` owns the hosted install/build
commands, so project dashboard overrides cannot silently change this branch's pipeline.

## Environment ownership

| Setting | Development | Preview | Production |
| --- | --- | --- | --- |
| Convex target | Personal dev deployment | Separate backend per branch | Existing production backend |
| `REGISTRATION_MODE` (Convex) | `test` | `test` | `live` |
| `STRIPE_SECRET_KEY` (both services) | Test account | Test account | Live account |
| `REGISTRATION_TEST_RECIPIENT` (Convex) | Tester mailbox | Tester mailbox | Not used for customer delivery |
| `SITE_URL` (Convex) | `http://localhost:3000` | Vercel branch URL | Public production origin |
| `REGISTRATION_STRIPE_WEBHOOK_SECRET` (Convex) | Dev endpoint secret | Branch endpoint secret | Production endpoint secret |

`RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `JWT_PRIVATE_KEY`, and `JWKS` must exist in each
Convex deployment. Preserve existing auth identities and signing keys. Google OAuth
also needs its existing `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` and the deployment's
callback URL registered with Google. Google/OTP provider acceptance is separate from
build validation. Vercel environment variables do not automatically populate Convex.

The hosted build runs `convex deploy --cmd 'bun run build:vercel'`. Convex supplies
that backend's client and HTTP URLs. The build script sets `SITE_URL` and registration
mode, validates backend prerequisites, creates or updates the matching Stripe endpoint,
and saves newly issued signing secrets directly to Convex. Existing endpoints require
their existing secret; builds do not rotate secrets. It then builds Next.js, and Convex
pushes the functions/schema only after the frontend build succeeds. This requires the
Stripe key to have webhook endpoint management permission.

New preview backends inherit the project's preview defaults (test Stripe credential,
test mailbox, sender, Resend, auth signing keys, and internal email secret). The script
fills in their unique site URL and webhook secret. Never put a live key in preview
defaults. Fixture password auth is forbidden on hosted builds.

Stripe endpoints subscribe to Checkout completion/expiration/async success/failure,
refund created/updated, and invoice paid/voided/marked-uncollectible events. Both
Checkout and invoices validate the configured payment mode before settlement.
Production email uses each queued recipient; test email always goes to the configured
tester mailbox. The staff test-email tool still requires its explicit safe mailbox.

## Local setup

Copy `.env.example` to ignored `.env.local`, or pull the Vercel development environment
into a temporary file and merge it with existing local settings. Keep local
`CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` pointed at the same dev backend.
Configure Convex secrets with `bunx convex env set NAME` (stdin is supported), then run
`bunx convex dev --once` and `bun run dev`. Do not copy production credentials into dev.
The shared registration mode defaults to `test` when unset and rejects invalid modes.

## Upgrade notes and release checks

Dependencies were refreshed on October 21, 2026, including Next 16.4.2, React 19.3.1,
Convex 1.47, Sentry 11.8, and Ultracite 8. Biome is intentionally pinned to 2.5.15:
Biome 2.6.2 removed the nursery rule used by Ultracite 8.0.1 and cannot load that preset.
Convex Auth remains on its stable v1 line to preserve passwordless email-code support.
Sentry's build wrapper now imports from `@sentry/nextjs/config`, as required by v11.
Vercel and `engines.node` both use `24.x` to avoid the old open-ended major override.
Partial prefetching explicitly retains the prior behavior during this dependency update.

Configuration is not payment acceptance: run a test Checkout, invoice, signed webhook,
refund, and portal-email flow before enabling native booking links. Stripe Tax must
have the business address and appropriate tax registrations configured by the account
owner. No live purchase, refund, or customer email is needed for build verification.
`NEXT_PUBLIC_NATIVE_REGISTRATION` stays off until reviewed offerings are published.
This PR does not migrate auth, merge itself, or deploy the production application.
