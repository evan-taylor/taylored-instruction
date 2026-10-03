# Cloud-agent implementation prompt

Implement the native class registration system for Taylored Instruction in `evan-taylor/taylored-instruction`.

Start from the pushed branch `codex/registration-plan-package-updates`. Read `AGENTS.md`, `docs/plans/class-registration.md`, `docs/plans/package-upgrade-notes.md`, and `docs/plans/convex-auth-v2-migration.md` before writing code. The registration plan records the completed product interview and is the authoritative specification. Do not restart the interview or substitute Hovn behavior for those decisions. Resolve routine implementation details independently; ask only if a genuinely blocking product ambiguity remains.

The starting branch contains package upgrades, compatibility changes, and planning documents; it does not implement registration. Keep the upgrades. First migrate to Convex Auth v2 following the added migration worklist and https://auth-v2.previews.convex.dev/getting-started. Pin the exact alpha release, preserve existing user IDs/profiles and Google/passwordless email-code login, and validate on a development deployment before registration work. The upstream v1 migration page is currently WIP; do not invent a turnkey migration or silently switch OTP to passwords. Auth v2 is explicitly requested despite being alpha, but production cutover is not authorized. Use Bun and the existing Next.js/Convex/Convex Auth/Stripe/Resend architecture. `CLAUDE.md` still contains obsolete Supabase/NextAuth references; do not follow those over actual code and the plan. Hovn is only an optional rough reference and may not be available in your cloud environment; the plan is self-contained.

Complete every implementation phase and acceptance scenario in `docs/plans/class-registration.md`. Maintain a visible requirements checklist and implement working UI, backend, authorization, durable jobs, and tests—not placeholder screens or a narrower MVP.

Particularly important decisions:

- Every scheduled session has its own stable, shareable short link, including unlisted sessions. The link must survive schedule edits, and admin-only sessions must remain protected.
- Templates have one delivery type, scheduled or self-paced. Sessions inherit current defaults unless overridden; completed orders retain purchased prices, choices, and acknowledgments.
- One session/course per checkout, multiple named attendees allowed, distinct attendee emails required. Guest checkout and verified, scoped purchaser/attendee access are required.
- Materials are included, optional, or required-waivable per attendee. Exact waiver text: "I already have this material"; opting out reduces price and prevents fulfillment.
- Keycodes are unique links from shared inventories, entered by bulk paste. Insufficient stock never blocks purchase: immediately notify the affected attendee to contact the business and notify the admin. Restocks automatically fulfill oldest paid outstanding entitlements. Never allocate a code twice.
- Deliver materials after payment, offline-payment recording, explicit payment waiver, or zero-total completion. Newly added included materials propagate only to paid attendees in upcoming inheriting sessions, not past/underway sessions or historical self-paced enrollments.
- Coupon limits count discounted seats, not orders. Support 100% off for exactly two uses, tuition-only versus materials-inclusive scope, no automatic restoration, and card-free zero totals.
- Capacity holds, coupon reservations, waitlist offers, fulfillment, webhooks, refunds, and retries must be transactionally safe and idempotent.
- Outcomes are multiple configurable categorical/numeric fields per attendee/session; completion comes from rules with an audited admin override. Admins and assigned instructors can see outcomes; attendees and purchasers cannot.
- Admins handle cancellations/refunds/transfers. Assigned instructors have only their session tools. Respect notification suppression checkboxes without skipping schedule/job updates.
- Replace public course-booking links only after native offerings are ready. Preserve existing eCard/product purchases, corporate/contact flows, authentication, instructor resources, and Sanity content.

Use development/test services only. Run Stripe tests in test mode and direct test emails only to safe test recipients. Do not send real customer emails, charge/refund real customers, deploy to production, or change production credentials. Keep secrets out of commits and logs. Document configuration still needed for release.

Run frozen-lockfile install, lint, type-check, production build, meaningful backend/concurrency tests, and browser E2E for the acceptance scenarios. Build with Sentry uploads disabled when source-map upload is not explicitly intended:

`SENTRY_AUTH_TOKEN= SENTRY_ORG= SENTRY_PROJECT= NEXT_TELEMETRY_DISABLED=1 bun run build`

The existing `bun run test` only runs lint and type-check; it is not evidence of behavioral correctness. Add and run actual tests. If an external prerequisite blocks a check, finish unaffected work and report exactly what remains unverified.

Finish with committed implementation changes on a feature branch based on the handoff branch, a requirements coverage checklist, test evidence, environment/setup instructions, and remaining blockers. Keep all approved features in scope and persist until implementation is complete.
