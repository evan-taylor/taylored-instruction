# Registration analytics

The canonical event list and property allowlist live in
`shared/registration/analytics.ts`. Browser calls go through
`lib/registration-analytics.ts`. The current implementation defines 52 explicit
registration events, plus eCard checkout creation and verified purchase events.

## Funnel

Use these stages in order:

1. `registration_offering_viewed` — one event per mounted offering.
2. `registration_form_started` — first purchaser first-name edit.
3. `registration_submitted` — reservation attempted after browser validation.
4. `registration_reserved` — backend reservation committed.
5. `registration_checkout_ready` — Stripe checkout secret obtained.
6. `registration_payment_form_ready` — Stripe Elements ready.
7. `registration_payment_submitted` — purchaser confirms payment.
8. `registration_settled` — backend settlement succeeds.

Free registrations skip the payment stages. `registration_success_viewed` is a
status-page observation, not a purchase. `registration_payment_returned` is a
Stripe confirmation return, not settlement. `registration_settled` also covers
free, offline, invoice and material-balance settlements when browser context is
attached; segment by `payment_source` and `total_cents`. Amounts are integer
cents, with tax separate from the pre-tax total.

## Additional coverage

- Discovery: debounced search presence, date filter, list/calendar choice, load more.
- Enrollment: self/others mode, attendee add/remove, material selections and waivers,
  browser validation, reservation failure, review, restart.
- Payment: checkout start/ready/failure/retry, billing and payment field completion
  (no values), confirmation failure, hold expiry, cancel and leave intent.
- Capacity: waitlist submission/success/failure and invitation decline outcomes.
- Group training: request attempt/success/failure and headcount.
- Emailed payments: payment start/ready/failure and payer identity handoff.
- Portal: loaded view/count and failures; material open intent/success/failure.
- Backend: reserved, released, settled and selected payment-reconciliation exceptions.

Browser leave events are best effort and do not prove a hold was released.
`registration_released` records the backend transition. Field completion events
can repeat when a purchaser edits a previously complete Stripe field; use unique
orders when calculating conversion rates. The offer, form and payment-form state
observers suppress React effect replays; page remounts can produce new observations.

## Identity and privacy

The browser passes its distinct and session IDs in an optional Convex argument.
They are stored on the order and used by the scheduled analytics action. Emailed
payment requests attach context only after validating the order access key.
Legacy/staff orders without browser context emit no person-correlated backend
analytics; they are not attributed to a made-up shared person. HTTP commerce
requests use `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID`; the contact server
action receives explicit context. OTP verification is captured after identifying
the verified Convex user.

Private registration paths still suppress automatic capture, pageviews, replay,
and raw exceptions. Explicit allowlisted events are rebuilt from safe scalar
properties and identity fields. SDK URL/referrer properties, form values, names,
emails, answers, request keys, invitation tokens, material URLs and person traits
are excluded on these routes. Failures use static stages instead of raw error
messages. Existing Sentry and Vercel private-route filters remain in place.

Analytics network delivery runs outside the Convex business transaction. Retrying
a reservation or settlement does not schedule another copy of that transition.
The scheduled action's network failure does not undo payment. Delivery is best
effort; no separate analytics retry/outbox system is introduced.

`ecard_purchase_completed` requires Stripe's `paid` or `no_payment_required`
status and uses a deterministic event UUID per checkout session. It is emitted
when the success-page email endpoint retrieves that session, so it is not a
replacement for webhook-based eCard reconciliation.

## Configuration and release verification

The browser uses the first-party `/ingest` rewrites; server SDKs use the direct
PostHog host. See the [PostHog Next.js proxy guide](https://posthog.com/docs/advanced/proxy/nextjs).

- Next.js: `NEXT_PUBLIC_POSTHOG_KEY` (or `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) and
  `NEXT_PUBLIC_POSTHOG_HOST`. If both tokens are present, KEY takes precedence.
- Convex: configure `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` for the same project.
  The public-token/host names are accepted as fallbacks, but Next.js env files do
  not configure the Convex deployment.
- Backend events include `environment` from `REGISTRATION_MODE`.
- Deploy the optional Convex schema/function arguments before the frontend.
- Verify one complete test registration in an isolated deployment: browser IDs
  match backend events, amounts match Stripe, replay/URLs/tokens stay excluded,
  and repeated webhook delivery does not add another settlement.

## Audit disposition

Locally addressed: client/server identity handoff, OTP ordering, first-party
proxy, business-event coverage, missing-token behavior that previously crashed
development, and SDK upgrades to posthog-js 1.438.23 / posthog-node 5.57.2.

Both supported public token variables were present and nonempty in `.env.local`
when checked on October 26, 2026; the audit's missing-local-token observation is
stale. No real environment variables were written by this change.

Still requires deployment/account verification: Vercel and Convex token/host
configuration, live event arrival, old SDK traffic aging out, reverse-proxy health,
and account-level error alerts/rate limits. These are not resolved by a local build.
