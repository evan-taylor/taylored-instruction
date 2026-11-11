# Development environments

Use Node 24 and Bun 1.3.14. Install with `bun install --frozen-lockfile`.
The package manifest and lockfile own dependency versions; do not upgrade tools
as part of starting a workspace.

## Choose the backend before starting

For a personal checkout, use your own development deployment. For an agent,
use an isolated local backend or an expiring cloud deployment. Never point
multiple agents at a developer's shared backend.

In a new, unconfigured workspace without Convex credentials, `bun run dev:full`
uses Convex's noninteractive anonymous local development flow. It syncs functions,
generates types and deployment URLs, then starts Next.js. Keep the command running:
a local backend stops when `convex dev` exits. Local state and credentials belong
in the ignored `.convex` directory, never in a shared snapshot or a commit.

An existing `.env.local`, login, or inherited `CONVEX_DEPLOYMENT`/`CONVEX_DEPLOY_KEY`
can select an existing backend instead. Inspect the target before running this
command. The scripts do not reset or silently replace a developer's selection.
For separate terminals, use `bun run dev:convex` and `bun run dev`.

Local Convex URLs work in a browser on the same machine, not automatically in a
remote user's browser. Public previews, Google callbacks and inbound Stripe/Resend
webhooks need routing or an isolated cloud backend.

For cloud integration testing, a trusted provisioner creates an expiring dev
deployment, configures test-only backend settings and endpoint-specific webhooks,
then gives the workspace a deployment-scoped key. Personal access tokens and
webhook-management credentials stay with the provisioner. Do not put a personal
Convex token in the shared agent secret set. Do not provision a deployment during
snapshot initialization: restored agents would inherit the same deployment.

## Environment ownership

Infisical stores values; injecting them into Next.js does not configure Convex.
Use separate secret paths or explicit allowlists for each runtime. The current
Capy Setup still injects the existing Infisical `dev` set into Next.js; it is not
an isolated full-stack agent environment. Replacing it requires tested backend
provisioning and a split secret inventory.

| Owner | Settings |
| --- | --- |
| Convex CLI | Selected deployment, scoped deploy key, generated `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` |
| Next.js browser | `NEXT_PUBLIC_BASE_URL`, Sanity project/dataset, optional Stripe publishable key, PostHog public token/host and `NEXT_PUBLIC_SENTRY_DSN` |
| Next.js server | Opt-in legacy Stripe/Resend integrations, Notion credentials, CMS write/revalidation/webhook secrets, internal email endpoint secret |
| Convex deployment | `SITE_URL`, isolated auth signing keys, optional email/Google credentials, registration test settings and endpoint signing secrets |
| Build/deploy only | `SENTRY_AUTH_TOKEN`, Sentry organization/project, Vercel's environment-specific Convex deploy key |

Convex writes the public backend URLs to `.env.local`; don't hardcode their values
in a shared Infisical set for isolated agents. Existing process environment values
override Next.js env files, so stale injected URLs can defeat this selection.
`CONVEX_SITE_URL` is Convex's HTTP origin; `SITE_URL` is the frontend origin.
Public `NEXT_PUBLIC_*` values are embedded at build time and are not secrets.

Configure deployment settings with `bunx convex env set NAME` using stdin, targeting
only the selected isolated backend. Project defaults apply to new cloud deployments;
they do not keep existing deployments synchronized. Generate separate auth signing
keys for isolated environments rather than copying production keys.

Sanity needs `NEXT_PUBLIC_SANITY_PROJECT_ID` for a full build. The dataset defaults
to `production`; choose a separate dataset before testing CMS writes. Ordinary
development does not need a Sanity write token, Sentry upload token, Notion token,
or working email credentials.

PostHog accepts `NEXT_PUBLIC_POSTHOG_KEY`, with the existing
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` as a compatibility fallback. Convex analytics
uses `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST`. Prefer a separate development
analytics project. Optional variables should remain absent until used.

Sentry now reads `NEXT_PUBLIC_SENTRY_DSN` in the browser, server and edge runtimes.
Set it in each hosted environment before deploying this change if reporting should
continue there. Omitting it disables reporting instead of sending development
events to the previously hardcoded project. Source-map upload remains separate
and needs `SENTRY_ORG`, `SENTRY_PROJECT`, and the build-only `SENTRY_AUTH_TOKEN`.

## Checks without service credentials

Run `bun run test` for lint, both TypeScript projects and in-memory Vitest tests.
Run `bun run build` for a frontend production build; this still needs the public
configuration and any data access its routes require. Neither command deploys Convex.

`bun run build:vercel` is not a local build shortcut. Vercel invokes it through
`convex deploy`; it configures backend settings and creates or updates Stripe
webhooks. Keep that command in the trusted deployment lane.

For Playwright, run `bun run test:e2e:install` first. On Linux CI, install system
dependencies with `bunx playwright install --with-deps chromium`. Playwright uses
its matching browser by default; `PLAYWRIGHT_CHROMIUM` is an explicit override.
Start the app against a disposable backend before `bun run test:e2e`. Admin QA
requires the isolated fixture setup in `docs/plans/registration-validation.md`.
Do not enable fixture authentication on a shared or hosted deployment.

## Integration tests are opt-in

Registration defaults to test mode, but legacy eCard and contact-email paths do
not share all its guards. A localhost URL is not proof of safety. Leave service
credentials out of routine tests; a contact form submission can send real mail.

Use a Stripe sandbox for both Next.js and Convex, with the publishable key from
that same sandbox. Set `REGISTRATION_MODE=test` and a controlled
`REGISTRATION_TEST_RECIPIENT` in Convex. Stripe webhook signing secrets belong to
the exact endpoint (or CLI forwarding session), not to the Stripe account generally.

Resend does not automatically redirect arbitrary recipients in development.
Use a sending-only, domain-scoped key for explicit email tests. Resend's test
addresses support delivery-event tests; OTP acceptance needs a controlled inbox.
Legacy contacts operations require separate permission. Configure
`RESEND_WEBHOOK_SECRET` on Convex for its delivery webhook. Verify all nonregistration
recipients before enabling those send paths.

## Sources

- [Convex agent environments](https://docs.convex.dev/cli/agent-mode)
- [Convex environment variables](https://docs.convex.dev/production/environment-variables)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Infisical with Next.js](https://infisical.com/docs/integrations/frameworks/nextjs)
- [Playwright browsers](https://playwright.dev/docs/browsers)
- [Stripe sandboxes](https://docs.stripe.com/sandboxes)
- [Resend test emails](https://resend.com/docs/dashboard/emails/send-test-emails)
