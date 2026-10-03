# Native registration: implementation and validation

Implementation branch: `codex/native-registration`, based on `codex/registration-plan-package-updates`. October 3, 2026.

## Authentication decision and preserved upgrades

Evan explicitly directed: **“Retain v1 pending upstream OTP support.”** This supersedes the handoff's Auth v2 prerequisite. Inspection of `@convex-dev/auth@2.0.0-alpha.2` found no shipped passwordless email-code implementation; its provider binding API is documented as not intended for application use. This change retains `@convex-dev/auth@^0.0.96`, existing Google/email-code providers, user IDs, profiles, and middleware. There is no auth migration or production cutover.

All original direct dependency versions on the handoff branch are preserved. Additions are Temporal, Convex validators/helpers, convex-test, Vitest, and Playwright. The Bun lockfile includes these additions. Next's generated AGENTS.md guidance is retained.

## Delivered components

- Additive Convex registration schema, indexed queries, transactional quotes/capacity/coupons, immutable purchase/acknowledgment snapshots, staff authorization, scoped guest access, outcomes, attendance, inventory, and activity records.
- Public discovery/list/month calendar, scheduled and self-paced details, stable private session links, multiple attendees and per-person material choices, authoritative checkout review, waitlist and secure portal.
- Administrative template/session/location/material/coupon editors, recurrence preview, inherited settings, inventory imports/assignment history, manual enrollment, payment recording/waiver, refunds, individual/bulk transfers, cancellations and reconciliation queues. Assigned-instructor roster, full paginated CSV export, attendance/outcomes, selected-recipient mail.
- Signed Stripe webhook and common settlement path; durable outbox, retries, reminders, calendar attachments, shortage/restock notifications, refund reconciliation, and explicit external Checkout expiration after local holds expire.
- Private registration routes excluded from analytics/replay and protected against caching/indexing/referrer leakage. No production credential changes. Native marketing switch remains off.

## Reproduction

Use Bun 1.3.14 and Node >=22.12. Run `bun install --frozen-lockfile`.

1. Start a **local or explicitly designated development** Convex deployment with `bunx convex dev`. Do not use `convex deploy`. In this cloud workspace an inherited cloud `CONVEX_DEPLOYMENT` needed to be unset before selecting the anonymous local deployment. Local endpoints are 3210 (client) and 3211 (HTTP).
2. Set `NEXT_PUBLIC_CONVEX_URL` in ignored `.env.local` to that deployment. Preserve the app's other existing development environment values. Never commit keys or export them into logs.
3. On that deployment only, set `REGISTRATION_ALLOW_TEST_FIXTURES=true`, then run `bunx convex run registrationFixtures:seed`. This internal fixture seeds example.test identities, three-meeting blended and self-paced offerings, private/admin-only/free sessions, material policies, instructor assignments and a two-use coupon. Remove/disable the flag outside isolated testing.
4. Run `bun run dev`. Browser verification uses **http://localhost:3000**. Next's development origin protection blocked hydration when this environment used 127.0.0.1 for the browser origin.
5. Run `bun run test` and `bun run test:e2e`. Playwright currently uses the cloud workspace's `/usr/bin/chromium`, with desktop and mobile Chromium projects. Adapt the executable path for another workstation.
6. Run `SENTRY_AUTH_TOKEN= SENTRY_ORG= SENTRY_PROJECT= NEXT_TELEMETRY_DISABLED=1 bun run build`. This does not deploy the application.

Convex generated files were produced with its CLI. Only an anonymous local backend was updated; cloud access returned `MissingAccessToken`.

## Test evidence

- Frozen-lockfile install: 1,916 installs across 1,579 packages checked, no changes.
- Lint and TypeScript: passed.
- Behavioral suite: **24 passing tests** in `tests/registration/backend.test.ts`. Covers transactional last-seat and coupon limits; email uniqueness; authoritative pricing; signed Stripe HMAC verification/tamper/replay; late-payment exceptions; free/offline settlement; shortage/restock idempotency; inheritance/propagation; permissions/purchaser separation; portal replay/tampering; refund caps and allocations; transfer history/withholding; DST recurrence; CSV/URL safety; email delivery leases/retry exhaustion; cancellation cleanup; suppressed-notification rescheduling; policy acceptance.
- Browser suite: **10 passing tests**, five scenarios on desktop and mobile. Covers public/private discovery, material pricing choices, real local-backend zero-total checkout and success status, scanner-safe access confirmation, login/contact rendering and protected eCard redirect. The suite does not use fake frontend query responses.
- Production build with Sentry uploads disabled: passed. No source maps intentionally uploaded.
- `git diff --check`: passed.

These tests are evidence of the scenarios named above, not a claim that every provider integration or every staff screen received a browser acceptance run. See the requirements checklist for release verification boundaries.

## Required development service configuration

Set these on the **development Convex deployment**. Only `REGISTRATION_STRIPE_WEBHOOK_SECRET` and `REGISTRATION_TEST_RECIPIENT` are new required settings; reuse `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and `SITE_URL` if already configured there. Values set only on Vercel or in the workspace are not automatically available in Convex. Do not change production keys to run these tests.

The obsolete `REGISTRATION_STRIPE_TEST_KEY`, `REGISTRATION_BASE_URL`, `REGISTRATION_EMAIL_FROM`, and `REGISTRATION_TAX_POLICY` variables are no longer read and can be removed from development configuration. Existing auth keys/providers are unchanged.

Settings:

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Reuse the existing setting with a `sk_test_` or `rk_test_` key on the development deployment. Registration rejects live keys. |
| `REGISTRATION_STRIPE_WEBHOOK_SECRET` | Signing secret for this development endpoint's test events. |
| `SITE_URL` | Reuse the auth setting: the development website origin, used for Checkout return URLs and portal links. |
| `RESEND_API_KEY` | Development email provider credential. |
| `AUTH_EMAIL_FROM` | Reuse the verified sender already configured for OTP email. |
| `REGISTRATION_TEST_RECIPIENT` | Explicit safe mailbox controlled by the tester. **Every registration email is redirected here**, including admin alerts and portal links. |
| `REGISTRATION_ADMIN_EMAIL` | Intended operational shortage-alert recipient; defaults to the existing admin allowlist. Test redirection still applies. |

Subscribe the development Stripe endpoint `https://<development-site>/registration/stripe` to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `refund.created`, and `refund.updated`. Forward those events to localhost:3211 when using Stripe CLI locally. Use only Stripe test cards and test refunds.

Local capacity/coupon holds last 30 minutes. Stripe's minimum session-lifetime constraint requires a later provider expiry; the local expiry worker explicitly closes the Stripe session with retries. A payment racing expiry is a visible reconciliation exception and cannot take an already-released seat. Do not treat the Checkout redirect as settlement.

## Remaining release setup and checks

No dedicated working Stripe test credentials, webhook endpoint secret, verified safe email configuration, or authenticated cloud Convex deployment was available for provider acceptance. No real provider Checkout, refund, email, Google login, or OTP email was initiated. Complete these checks in development:

- Create a real test Checkout; pay with a test card; confirm signed delivery, receipt/material mail, replay safety, expiration, and partial/full test refunds. Exercise provider timeouts and retry/reconciliation.
- Verify sender authentication, the chosen safe mailbox, portal email delivery/exchange, calendar update/cancellation rendering, and shortage/restock messages. Exercise approved-admin and assigned/unassigned-instructor browser workflows using verified development identities.
- Verify existing Google and email-code login, authenticated instructor resources, Sanity Studio, and existing test eCard/product commerce. The browser smoke checks cover rendering/redirects, not provider completion.
- Decide registration tax treatment with the Stripe account owner. Test registration Checkout explicitly disables automatic tax; there is no tax-policy environment switch and this does not assert exemption or resolve production tax policy. **If automatic Stripe Tax is required, tax-inclusive quote/finalizer support remains a release blocker**; existing product commerce tax settings remain untouched.
- Publish reviewed native offerings/materials/instructors/coupons in development and complete staff acceptance. Only then consider `NEXT_PUBLIC_NATIVE_REGISTRATION=true` to change marketing booking links. It defaults to the previous Hovn links.
- Production email delivery and live Stripe keys remain intentionally unavailable in this test-only implementation. Any production enablement is a separate reviewed change and deployment, neither performed nor authorized here.

Auth v2 remains deferred per Evan's instruction until upstream supports the required OTP flow. The original migration worklist remains useful for that future effort.

## Environment simplification follow-up

Registration now reuses `STRIPE_SECRET_KEY`, `AUTH_EMAIL_FROM`, and `SITE_URL`; its redundant aliases and tax-policy switch are removed. The shared Stripe key must still be a test key. Both scheduled registration mail and portal access mail retain forced safe-recipient delivery. No deployed secrets were changed.

Validation: `bun run test` passes lint, TypeScript, and 26 behavioral tests. The added tests reject a live shared Stripe key before checkout and exercise the portal-mail action with a mocked provider, verifying the shared sender/site origin and safe recipient. Signed webhook verification now uses the shared Stripe setting. This change does not certify hosted provider acceptance.
