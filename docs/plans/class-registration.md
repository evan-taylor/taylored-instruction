# Class registration implementation plan

Status: product decisions approved by Evan on October 3, 2026. Feature implementation is delegated to a cloud agent; this branch prepares dependencies and this plan only.

This document is the authoritative handoff for Taylored Instruction. Hovn is a rough UX/domain reference, not a specification to clone. All requirements below come from the interview; implementation defaults are called out separately. Do not replace these decisions with Hovn behavior or stale repository documentation.

## Auth prerequisite added after the interview

Migrate to **Convex Auth v2** before implementing registration identity and permissions. Follow [the migration worklist](convex-auth-v2-migration.md), which records the current preview APIs, existing-user preservation, Google/email-code parity, development validation, and production cutover boundary. This is required implementation scope, not completed work on the preparation branch.

## 1. Delivery boundary and existing architecture

- Implement in this repository using Next.js App Router, TypeScript, Bun, Convex/Convex Auth, Stripe, Resend/React Email, and the existing UI styling. Do not introduce another backend or multi-tenant platform.
- `convex/schema.ts` currently has auth, profiles, products, analytics, onboarding, migration, and SEO tables. No native registration system exists yet.
- `convex/auth.ts`, `convex/ResendOTP.ts`, `providers/ConvexClientProvider.tsx`, and `proxy.ts` provide authentication. Extend these patterns; guest registration must not be forced through an account signup.
- `shared/adminEmails.ts`, `lib/admin.ts`, and `convex/admin.ts` contain the existing admin checks. Preserve existing admin access. Existing `profiles.isInstructor` grants instructor-resource access, not access to all registration data.
- `app/api/create-checkout-session/route.ts`, `app/api/create-cart-checkout/route.ts`, `app/api/get-stripe-prices/route.ts`, and `app/api/send-ecard-emails/route.ts` serve existing commerce. Preserve them; do not reuse client-trusted cart totals or success-page email triggers as the new fulfillment architecture.
- `lib/resend.ts`, `emails/`, and `convex/notifications.ts` provide email patterns. New registration mail needs persistent delivery tracking, retry handling, and idempotency.
- `convex/http.ts` currently registers auth routes. Add a verified Stripe webhook endpoint without breaking auth routes.
- `components/CourseRegistrationButton.tsx`, course content components, both headers, Hero, ServicesSection, contact, and the instructor-trainer page currently link to Hovn. Replace course booking links only at launch, after published data exists.
- Sanity powers editorial content and Studio. Keep operational registration data in Convex. Preserve Sanity, SEO, eCard/product purchases, instructor resources, and corporate-training/contact flows.
- `CLAUDE.md` contains obsolete Supabase/NextAuth/Next 14 guidance. Actual source and current AGENTS.md take precedence. No Supabase registration tables or NextAuth migration are needed.
- Existing `bun run test` means lint plus type-check, not behavioral tests. Add meaningful backend and browser tests for this feature.

### Reference locations (optional; cloud agent may not have Hovn)

Local reference: `/Users/evantaylor/Development/hovn-app`. Relevant files inspected: `features/discovery/sessions/ui/bulk/selected-materials-form.tsx`, `features/sessions/admin/booking/hooks/use-booking-price-calculation.ts`, and `packages/utils/functions/material-policy-label.ts`. The self-contained policy definitions below are sufficient when Hovn is unavailable. Do not change the Hovn repository.

## 2. Approved product decisions

### 2.1 Course templates, sessions, and meetings

1. Admins create reusable course templates and schedule sessions from them.
2. Each template has exactly one delivery type: scheduled or self-paced. A blended course is scheduled, with online materials/outcomes alongside its meetings. Offer duplicate-template creation for related offerings.
3. A scheduled session has one or more required meetings. Each meeting has its own start/end time, physical location and/or online meeting link, and private access instructions. A seat covers the entire session and all meetings, using one shared capacity.
4. Support reusable saved locations. Public pages show venue/general location; online joining links and private instructions are visible only to registered attendees and authorized staff.
5. Sessions inherit current template settings unless explicitly overridden at the session level. Do not snapshot all template configuration at session creation. UI must show inherited versus overridden settings and offer reset-to-template.
6. Existing completed purchases retain their original prices and material selections. Template inheritance must never silently reprice a paid order, create a new charge, or allocate another copy of an already assigned keycode.
7. Visibility modes: public (listed), private/unlisted (registration by link), and admin-only enrollment. Draft/published controls allow preparation without exposing unfinished offerings.
8. Each individual session has its own stable, shareable short link, including private sessions. Copy-link controls belong on session list/detail pages. See section 5 for access rules.
9. Admins can duplicate sessions and generate recurring sessions from date ranges and weekdays. Each occurrence is a separate bookable session. Multi-meeting sessions preserve relative days/local times. Preview all dates before publishing; respect time zones and daylight saving transitions.
10. Registration closes at the first meeting's start by default, configurable on the template and overridable per session. Admins can enroll after cutoff.
11. Self-paced courses have no meeting dates or seat-capacity limit and stay open until enrollment is closed. Repeated purchases for the same attendee email are allowed as separate enrollments, with a duplicate-purchase warning. There is no certificate issuance integration in scope.

### 2.2 Registration, identity, and portals

1. One checkout covers exactly one scheduled session or one self-paced course, with one or multiple attendees. The purchaser may attend or purchase for others.
2. Every seat requires attendee name and email before purchase. No unnamed/prepaid seats to assign later.
3. Attendee emails must be unique within an order and among active registrations/holds for a scheduled session. The same attendee can take other sessions. Purchaser email may equal one attendee email. Repeated self-paced purchases in separate orders are allowed.
4. Normalize email by trimming and consistent case normalization; do not collapse provider-specific dots or plus aliases. Enforce uniqueness transactionally server-side, not just in form validation.
5. Guest checkout is supported. Send secure email access afterward; verified account holders can see associated registrations. Never attach a registration solely because an unverified account claims its email.
6. Student portal: registrations, meeting information, private joining instructions, and purchased/entitled materials. No outcomes or internal completion information in attendee or purchaser responses, exports, emails, or portal UI.
7. Purchaser portal: orders, payment information, and the attendees purchased. It does not grant access to another person's private materials/keycodes, outcome records, or custom answers by default. If purchaser is also an attendee, expose that attendee's own entitlement separately.
8. Templates support custom per-attendee text, multiple-choice, and checkbox questions, including required acknowledgments linked to policies. Record question/acknowledgment wording, answers, accepted policy version/link, and acceptance time on the registration.
9. Existing responses are historical evidence; later template changes do not rewrite accepted wording or add fictitious answers.

### 2.3 Pricing and coupons

1. Use the existing Stripe account and USD only. No added checkout service fee. Show the full amount before payment.
2. Template defines default per-attendee pricing; session can override. Present tuition, materials, opt-outs, discounts, and total clearly per attendee and for the order.
3. Coupons support percentage or fixed discounts, applicability to selected courses or all courses, expiration, and finite redemption limits.
4. A coupon use means one discounted seat, NOT one checkout. A 100%-off coupon with two uses can discount two seats across one or multiple purchases. In a three-seat order with two uses remaining, only two seats are discounted; the third is full price.
5. Coupon scope is tuition only (default) or tuition plus selected materials. Included material cost must remain representable separately so tuition-only coupons do not accidentally discount it.
6. Apply a fixed discount per eligible seat, capped at that seat's eligible subtotal. Apply percentage discounts with deterministic integer-cent rounding. Record the allocation per seat/line for later refunds and audit.
7. Free courses and genuinely zero-total orders (including 100% coupons) complete without requiring a card. A tuition-only coupon can leave material charges due; do not call that a free order.
8. Discounts apply only to eligible course/seat lines, after material choices. One coupon per checkout is the implementation default; stacking was not requested.
9. Reserve coupon uses during checkout and release unused reservations on expiration/cancellation. Consume on confirmed payment or successful zero-total completion, transactionally with enrollment. Concurrent orders cannot exceed the limit.
10. Refund/cancellation does not restore coupon uses automatically. Admins may explicitly restore a consumed use; keep an audit trail and prevent duplicate restoration.
11. This interview did not set new tax policy. Preserve existing commerce tax behavior. For registration, make applicable tax treatment explicit in configuration and deployment documentation; do not invent rates or claim tax exemption. If existing account configuration requires Stripe Tax, ensure final totals are visible and match payment before confirmation.

### 2.4 Reusable materials and keycode inventory

Supported types: uploaded PDFs, reusable shared links, and unique keycodes that are individual redeemable links. Materials/inventories are reusable across templates; inventory is centrally tracked.

| Per-template/session material policy | Default | Price behavior | Fulfillment |
| --- | --- | --- | --- |
| Included | Always included; cannot opt out | Already part of displayed seat price | Deliver after payment/waiver |
| Optional | Not selected | Add material price when selected per attendee | Deliver only if purchased |
| Required, waivable | Included by default and labeled required | Subtract material price if attendee selects "I already have this material" | Do not deliver or allocate inventory when waived |

- Material prices/policies belong on the template attachment, with session overrides; the reusable material owns the asset or inventory. The same material may be priced differently across courses without duplicating stock.
- Capture material choices per attendee, not merely per order. No proof or staff approval is required to waive a material; use the exact acknowledgment above.
- Deliver entitled materials immediately after confirmed payment, recorded offline payment, or explicit admin payment waiver. Zero-total completed registrations count as settled. Unpaid registrations do not receive materials.
- Allocate one unique link from each purchased/required inventory per attendee. Bulk paste only, one link per line; validate URL safety, preview valid/duplicate/invalid counts, detect duplicates within a paste and across inventories. No CSV inventory import is needed.
- Track available, assigned, and retired entries, with immutable assignment history. Never automatically return a delivered link to stock after cancellation, refund, or replacement.
- Admins can manually assign inventory to a particular attendee, retire unused entries, resend existing assignments, and replace broken codes while retaining old assignment history.
- Stock shortages MUST NOT block purchase. Deliver all available materials. Email each affected attendee that they need to contact the business for their missing keycode; email the configured admin recipient immediately with the attendee/order/material needing fulfillment. Persist the unfulfilled entitlement in the attention queue.
- When inventory is replenished, automatically assign and email outstanding paid entitlements, oldest paid registration first. Process atomically in bounded batches so simultaneous restocks/manual assignments cannot double-assign a code.
- Retry emails without consuming another code. Deduplicate shortage notifications per missing entitlement; if restock wins a race, recheck outstanding status before sending a stale shortage notice.
- New included template materials automatically go to already-paid attendees ONLY in upcoming sessions that inherit those materials. Upcoming means the first meeting has not started at the time the change is applied; exclude underway, finished, canceled, and canceled registrations. A session override blocks propagation for the overridden material configuration.
- This retroactive automatic grant does not apply to historical self-paced enrollments: no upcoming scheduled session exists. Their purchase entitlements remain intact. New self-paced purchases use current configuration.
- Adding optional/waivable paid materials never automatically charges or fulfills past orders. Editing an existing material does not automatically resend it or allocate another code. Explicit resend/replacement actions are available.
- Removing a template attachment does not erase an existing purchase entitlement/history. PDF replacement creates an asset version; preserve what was delivered and allow an explicit update/resend.

### 2.5 Emails and calendar invitations

- Editable subject and formatted body per course template, with session overrides, for confirmation/material delivery, reminders, and follow-ups. Use a constrained editor, supported merge fields, escaping/sanitization, preview, and test-send to an explicitly chosen test address.
- Supported variables include attendee/purchaser name as appropriate, course/session title, meeting dates/time zone/location, portal link, and entitled materials. Essential registration details are appended structurally so they cannot accidentally be omitted.
- Purchaser receives order/payment receipt; attendees receive their own course information and materials individually. Never put multiple attendees' unique links into one attendee email or expose recipient addresses via CC.
- Multiple email steps, such as seven days and one day before first meeting, and one day after last meeting. Self-paced timing is relative to registration. Skip past-due reminders for late registrations; do not flood them with old steps.
- Date/time/location changes show affected attendees and editable notification before save. Email checkbox defaults ON and can be unchecked. Update future reminder schedules even when notification is suppressed.
- Instructor assignment/schedule-change messages also default ON, with suppression checkbox. Include meeting details and roster link; keep internal staff notes out of attendee messages.
- Include calendar invitations with confirmation and schedule changes. Use stable per-meeting UIDs and increment sequence numbers; cancellations should cancel the same events. Suppressing email also suppresses that outgoing calendar update, but portal/download reflects latest schedule.
- Assigned instructors may email selected attendees with an editable message. Log actor, recipients, content snapshot, and result. No arbitrary external audience/bulk marketing feature is implied.
- Operational messages such as shortage alerts and waitlist invitations are separately tracked. Email errors do not roll back a paid registration; they enter the attention queue for retry.

### 2.6 Capacity and waitlist

- Hard capacity for public checkout, across all meetings. Reserve seats for 30 minutes during Stripe checkout; release abandoned/expired holds. Decrease available count immediately and enforce with a transaction.
- Admin can explicitly exceed capacity after a warning, with actor/reason logged. Admin unpaid enrollments reserve capacity until resolved/canceled; show them in attention queue.
- Full sessions have an unpaid waitlist. Offer openings in order using secure, time-limited registration invitations, reserving a seat while the offer is valid.
- Default invitation validity is 24 hours, configurable per session. Never offer beyond registration cutoff; release/expire offers at cutoff or cancellation. Accepted invitations exchange their reserved seat for a checkout hold without double-counting capacity.
- Default waitlist entry is one named attendee/email per seat, preserving FIFO. Checkout using an invitation can only consume that invitation's allowance; additional attendees need separately available seats.
- Expired/declined offers advance the queue. Recheck eligibility immediately before payment. New public buyers must not steal seats already reserved for an invitation.
- Scheduled session email uniqueness includes pending holds, enrolled attendees, and outstanding waitlist offers. A canceled registration can be re-enrolled through a controlled new registration; retain prior history.

### 2.7 Admin operations, roles, attendance, and outcomes

- Admins manage templates, sessions, locations, pricing, coupons, inventory, payments, refunds, transfers, outcome definitions, and permissions.
- Instructors see/edit only their assigned sessions: roster search, attendee custom answers, per-meeting attendance, outcome entry, CSV export, and selected-attendee email. No refunds/transfers/pricing or global student/inventory access.
- Existing instructor approval alone does not grant access to unassigned sessions. Enforce authorization in every backend query/mutation/action and export; hiding UI is insufficient.
- Outcomes are multiple independent fields per attendee within each session, defined on the template and overridable at session level. Examples: online complete/incomplete, prerequisites met/unmet, numeric exam percentage.
- Support configurable categorical fields and numeric percentage fields with optional completion requirements. Required categorical matches and numeric thresholds jointly determine completion. Informational fields do not affect completion. Missing required values mean incomplete/pending, never passing.
- Completion uses outcome rules; no separate instructor "mark complete" shortcut. Previously agreed admin override requires a reason and audit history. A course with no required rules should stay not-evaluated, not silently mark everyone complete.
- Outcomes/overall completion remain staff-only. Assigned instructors view/edit; admins configure and override. Never include outcomes in student or purchaser API shapes.
- Record per-meeting attendance separately from outcomes. Support present, absent, and not-recorded; a no-show can be represented through configured outcomes. Changing definitions retains historical values/versions; do not reinterpret a past grade under a different scale silently.
- Admin manual enrollment: create attendee seats with names/emails, send a payment link, record offline payment, or explicitly waive payment. Materials only after settlement/waiver. No customer self-service cancellation/rescheduling; provide business contact link.
- Admin cancellations, full/partial refunds, and transfers. Show delivered materials and keycode history during decisions. A refund is an explicit financial operation, not implied by cancellation.
- Transfer to different price: show difference; admin chooses payment link to collect, partial refund, or keep paid amount. Matching material assignments carry over without duplicate fulfillment. Preserve original order and transfer/adjustment history. Additional material entitlements wait for any required additional payment.
- Entire-session cancellation: close registration, stop pending reminders/waitlist offers, release unpaid checkout holds safely, notify attendees and instructors, and offer per-registration or bulk refund/transfer. Never automatically refund merely because session was canceled.
- Activity log records important configuration changes, notifications/suppression choices, payments, refunds, transfers, coupon restoration, assignment/replacement, attendance/outcome edits, and overrides.
- Attention queue highlights missing keycodes, failed emails, unpaid admin enrollments, and payment/refund reconciliation exceptions. Actions must be safe to retry without another charge, refund, or keycode allocation.

## 3. Proposed architecture and data model

These are implementation recommendations, not a mandate to use these exact table names. Keep clear domain boundaries, typed validators, indexed access, pagination, and shared authorization helpers. Store money as integer USD cents and timestamps as epoch milliseconds; record IANA time zones for local scheduling.

| Entity | Core fields / relationships | Important indexes / constraints |
| --- | --- | --- |
| courseTemplates | slug, title, description, scheduled/self-paced, draft/published/archived, default pricing, registration cutoff, revision | unique slug; publication/type |
| sessions | templateId, immutable shortCode, visibility, publication/status, capacity, timeZone, override fields, revision, firstStart/lastEnd | shortCode uniqueness; template; public/upcoming |
| meetings | sessionId, order, start/end UTC, locationId, online URL, private instructions, calendar UID/sequence | session + order/start |
| locations | name, public address/label, private access notes, archived | active/name |
| sessionInstructors | sessionId, userId, assignedBy/at | session; user; unique pair |
| materials | title, pdf/link/keycode type, versioned storageId or shared URL, inventory identity, archived | type; active |
| templateMaterials | templateId, stable attachmentId, materialId, policy, price cents, sort order | template; material |
| keycodes | material/inventoryId, normalized URL fingerprint, protected URL, available/assigned/retired | fingerprint globally unique; inventory/status |
| orders | purchaser identity/email, session OR self-paced template, currency, price snapshot, status, payment source, Stripe IDs | purchaser; checkout/payment IDs; status |
| registrations | orderId, attendee name/emailNormalized, session/template, active/canceled/transferred, settledAt, price/material snapshot | session + email; order; verified email |
| holds | orderId, sessionId, seats, attendee emails, expiresAt, Stripe session ID, generation/state | session/status; expiry |
| coupons | normalized code, percent/fixed, amount, scope, course restrictions, expiration, max seat uses, disabled | code uniqueness |
| couponReservations / redemptions | couponId, order/registration, seat allocation, amount discounted, hold/consumed/restored | coupon; order; registration |
| materialEntitlements | registrationId, attachment/material version, source, purchased/waived/included, pending/assigned/delivered | registration; inventory/pending + paidAt |
| keycodeAssignments | keycodeId, entitlementId, assignedAt/by, replacementOf, retired reason | unique keycode assignment; entitlement history |
| questionDefinitions / answers | template/session revision, stable field IDs, required/type/options, answer/wording snapshot | registration; field |
| outcomeDefinitions / values | template/session field, categorical/numeric, allowed labels/threshold, required, value/actor/version | session; registration + field |
| attendance | registrationId, meetingId, status, actor/time | unique registration + meeting |
| completionOverrides | registrationId, reason, actor/time, status, prior computed result | registration/history |
| waitlistEntries / offers | sessionId, attendee identity, FIFO timestamp, offer token hash/expiry, offered seat state | session/status/time; token hash |
| emailDefinitions / steps | template/session scope, event, offset/anchor, subject/body, revision | template/session |
| emailJobs / deliveries | semantic dedupe key, recipient, rendered snapshot, dueAt, state, attempts, provider ID, schedule revision | due/state; dedupe key; registration |
| webhookEvents / operations | provider event ID, type, processed state, order, attempts/error, operation idempotency key | unique event/operation |
| refunds / transfers | registration/order, line allocations, amount, external operation ID, state, actor/reason | order; operation ID |
| portalTokens / grants | hashed token, email/subject, purpose/scope, expiresAt, consumedAt/revocation | token hash; principal |
| activityLog | actor, action, entity, safe before/after summary, time, correlation ID | entity/time; actor/time |

### Inheritance and historical records

- Represent overrides explicitly: absence means inherit; explicit empty lists/false/zero are valid overrides. Do not use truthiness fallback. Stable field/attachment IDs allow deterministic merges.
- Use consistent shared resolvers for effective session pricing, material attachments, emails, custom questions, and outcome definitions. A per-section list override is acceptable if UI states exactly what is overridden; avoid ambiguous partial-array merging.
- Session-local identity, meetings, capacity, visibility, short link, instructor assignment, and operational state are never overwritten by a template update.
- At checkout, store a versioned authoritative quote with line items/choices and expiry. At purchase, store immutable financial and acknowledgment snapshots; use current schedule for future reminders/portal display.
- Treat template edits as versioned domain changes. Propagation jobs are idempotent and bounded, only target eligible upcoming sessions, and recheck cancellation/override/settlement before grant.
- Outcome definition changes require version-aware editing and audit; preserve historical results and recompute only applicable records, making effects reviewable to admin.

## 4. Checkout, concurrency, and external side effects

### Server-authoritative purchase sequence

1. Fetch a safe public view; validate publication, access mode, cutoff, meeting status, attendee identity/answers, material choices, and coupon.
2. In a Convex mutation, compute all prices from stored configuration, allocate available coupon seat uses, check unique attendee emails, and reserve seats and coupon uses with a 30-minute expiry. Persist order/quote and semantic operation IDs. No external network calls inside a transaction.
3. An action creates Stripe Checkout using immutable server amounts and an idempotency key derived from the order/attempt. Stripe expiry must align with the local hold. If external creation fails, safely release holds or mark reconciliation required; no orphan reservation should live forever.
4. Return Stripe URL. Success page reads backend payment/registration status and may show processing; it must not trigger fulfillment or trust the redirect as payment evidence.
5. Verify raw-body Stripe webhook signature. Persist/deduplicate event ID. Correlate Stripe session/payment with order; verify account/mode, currency, amount, and payment status. Handle duplicate, delayed, and out-of-order events.
6. A transactional finalizer converts hold to enrollments, consumes coupon uses, creates entitlements, allocates available codes, queues emails, and logs completion exactly once.
7. For zero-total orders, use the same finalizer without Stripe/card requirements. Offline payment and admin waiver use authorized audited variants of that finalizer.
8. Durable scheduled actions deliver outbox jobs and retry transient errors with bounded backoff. Permanent errors surface in attention queue. Resend provider idempotency plus local dedupe limits duplicates; do not promise mathematically exactly-once external delivery.

### Critical race conditions

- Capacity includes active paid seats, unpaid admin enrollments, live checkout holds, and waitlist offer reservations. Atomically exchange reservation types rather than adding them twice.
- Coordinate expiry with Stripe status. A late payment after local expiry cannot silently overbook: recheck paid status/availability and finalize safely or create a visible reconciliation/refund exception. Prefer payment methods whose settlement behavior matches the hold, initially cards as existing checkout uses.
- Price/coupon configuration changes do not mutate a live quote. Honor valid quotes until expiry; cancel/requote explicitly after expiry. Coupon disable/cutoff/cancellation policies must invalidate checkout safely rather than accepting untracked payment.
- Keycode assignment is after settlement; keycode scarcity never blocks checkout. Unique URL fingerprint + transactional assignment prevents reuse across inventories/templates.
- Coupon reservation and seat hold use the same attempt lifecycle. Explicit restoration is audited and idempotent; refund webhooks do not restore automatically.
- Template additions, webhook retries, restock, manual resend, and admin fulfillment all target the same entitlement key, preventing double delivery/allocation.
- Refund and adjustment actions persist intent before contacting Stripe, use idempotency keys, and reconcile response/webhooks before showing success. Cap refunds to remaining refundable amount, allocating to original per-seat lines and discounts.
- Canceling a session invalidates future jobs/checkout attempts/offers. A currently executing worker rechecks eligibility immediately before sending or charging.

## 5. Short links, access, and privacy

- Proposed URL: `/s/<randomCode>` on the existing canonical domain. No separate URL-shortening service or new domain required. Use a collision-checked cryptographically random code with sufficient entropy, not a sequential ID or predictable database fragment.
- The code maps to one immutable session identity, surviving title/date/location changes. Duplicating a session creates a new code. Keep links for canceled/finished sessions with informative status; do not recycle old codes.
- Public and unlisted links open a registration detail page honoring cutoff/capacity/status. Private means unlisted bearer-link access, not an invitation-only identity boundary; do not expose such sessions through listings/search/sitemaps, autocomplete, analytics payloads, or sequential pagination.
- Admin-only session short links must not bypass authorization or expose private session details to anonymous users. Staff can share internally; unauthorized viewers see an appropriate restricted response.
- Use application-controlled resolution only; never accept arbitrary redirect destinations. Prefer dynamic resolution/non-permanent redirect so visibility changes remain enforceable. Private pages use noindex and private/no-store caching.
- Short session links are NOT student portal access tokens. Do not expose rosters, material links, emails, or outcomes through them.
- Portal magic links: random high-entropy token stored only as a hash, short-lived and purpose-scoped; exchange through a confirmation action into a secure HttpOnly session/grant. Email link scanners must not consume tokens just by GET. Rate-limit issuance/verification; avoid account enumeration.
- New access can be requested by verified email; never put private token URLs into PostHog, logs, referrers, or caches. A purchaser grant and attendee grant have distinct scopes.
- PDFs use Convex storage with entitlement-checked URL issuance; do not expose storage listings. Shared links/unique codes only appear after entitlement checks. Restrict allowed URL schemes and protect against script links.
- CSV exports prevent spreadsheet-formula injection and exclude keycode URLs and outcomes unless a staff-authorized export explicitly includes outcomes. No outcome-bearing attendee export exists.

## 6. Screens and routes

Suggested routes; adapt existing app structure without collision:

- `/classes`: public course/session discovery with list/calendar, date/course/location filtering, availability, and accurate default total including required waivable materials.
- `/courses/[slug]`: template offering detail, scheduled availability or self-paced buy action.
- `/s/[code]`: stable session entry point and share destination.
- `/register/...`: attendee details/questions, per-attendee material choices, coupon preview, itemized review, Stripe redirect or free completion.
- `/registration/success`: reconciled order state, purchaser receipt/access instructions; never fulfill here.
- `/registrations` and detail: secure attendee portal, with separate purchaser order views; authenticated account navigation can link here.
- `/admin/courses`: templates, default sections, publication, duplicate action.
- `/admin/sessions`: calendar/list, multi-meeting editor, recurrence preview, inherited/overridden indicators, share-link copy, roster, cancel/duplicate actions.
- `/admin/materials`: PDF/shared links, bulk-paste inventory, duplicates preview, stock counts, missing-code queue, manual/replacement assignment.
- `/admin/coupons`: scope, amount, course restrictions, seat-use counts/reservations, expiry, explicit restoration history.
- `/admin/registrations`: order/attendee search, manual enrollment/payment links, offline/waived payment, cancellation/refund/transfer workflows.
- `/admin/registration-activity`: attention queue, email retries, audit history, reconciliation exceptions.
- `/instructor/sessions`: assigned sessions and scoped rosters, attendance/outcomes, CSV, selected-attendee email.

Use accessible semantic controls, labels/errors, keyboard navigation, visible focus, readable mobile layouts, and loading/empty/error states. Preserve existing design language. Large roster and inventory lists must be paginated; no unbounded collect queries in user-facing screens.

## 7. Implementation phases and review checkpoints

Each phase must deliver connected backend/UI behavior, not placeholder pages. Keep a requirements checklist and report blockers explicitly.

0. **Convex Auth v2 migration:** complete `convex-auth-v2-migration.md`, preserve existing application identities and Google/email-code login, prove development SSR/session/role behavior, and document the separate production cutover. Resolve provider parity before using v2 for registration.
1. **Foundation and authorization:** verify upgraded baseline; add shared validators/money/date utilities, role and session-assignment checks, additive schema/indexes, auth-safe public projections, meaningful test harness (Convex test plus browser E2E or equivalent).
2. **Templates, scheduling, and short links:** complete admin CRUD, material/question/outcome/email configuration, inheritance/overrides, saved locations, multi-meeting sessions, recurring preview, publication/access modes, immutable short codes, public listing/detail.
3. **Registration and payment:** multi-attendee details/unique emails, choices/waivers, authoritative quote, coupon seat accounting, holds/cutoff, Stripe Checkout and verified webhook, free/offline/admin enrollment, purchaser receipt and scoped guest access.
4. **Materials and communications:** protected PDFs, reusable links, bulk-paste inventory, fulfillment/shortage notices, restock FIFO, upcoming-only propagation, email editor/merge fields, durable jobs/retries, schedule-change suppression, calendar updates.
5. **Operations:** FIFO waitlist/offers, attendance/outcomes/rules, instructor tools, refunds/cancellations/transfers and adjustments, activity/attention queue, completion override, portal completeness.
6. **Launch and regression:** replace course booking links, retain product/eCard/corporate paths, verify all acceptance scenarios, document configuration, run full checks, production-like test-mode browser/payment smoke, prepare reviewable deployment notes. Do not deploy production or transact against live customer records as part of test execution.

## 8. Acceptance tests (must be demonstrated)

### Authentication prerequisite

- [ ] Convex Auth v2 migration and every acceptance criterion in `convex-auth-v2-migration.md` are complete in development; production rollout remains separate.

### Templates and scheduling

- [ ] Template CRUD/publication and duplicate; exactly one delivery type.
- [ ] Single/multi-meeting sessions with physical/online/both locations; timezone/DST-aware recurring preview creates independent sessions and unique short links.
- [ ] Inherited fields change when template changes; explicit false/zero/empty overrides survive; reset restores inheritance.
- [ ] Public lists exclude drafts/private/admin-only. All session short links remain stable after edits; admin-only links reject anonymous access; canceled links show status without accepting payment.
- [ ] Registration cutoff prevents public purchase; authorized admin can enroll afterward/overbook explicitly.

### Checkout, pricing, and payment

- [ ] Purchaser buys for self and multiple other named attendees in one session; missing names/emails and duplicate normalized emails rejected, including concurrent requests.
- [ ] Another session accepts the same email; self-paced repeat purchase warns but succeeds as new enrollment; duplicate email within one order fails.
- [ ] Included material cannot be waived; optional adds price; required-waivable defaults included and exact acknowledgment removes price and entitlement per attendee.
- [ ] Example: tuition $100, included material $10, waivable $20, optional $15: default $130; waive -> $110; waive + optional -> $125. Tuition-only 100% coupon leaves $25 in the last case; all-material 100% yields $0.
- [ ] Two-use 100% coupon discounts exactly two of three seats; third charged. Concurrent checkouts cannot reserve/consume more than two uses. Fixed discounts cap at eligible subtotal, with deterministic cents/rounding.
- [ ] Expired/wrong-course/disabled coupons rejected; expired checkout releases reservations; refund does not restore; explicit admin restoration works exactly once.
- [ ] Free/fully discounted/offline/waived completion needs no card and uses the same entitlement finalizer. Unpaid admin enrollment withholds materials and reserves capacity.
- [ ] Stripe signed success fulfills once; invalid signature/amount/currency rejected; duplicate/out-of-order event safe; redirect alone cannot fulfill; late payment handled without overselling.
- [ ] Last-seat parallel checkouts allow one hold only. Expiry and waitlist conversion free/exchange seats correctly. No abandoned hold leaks indefinitely.
- [ ] Paid order preserves financial/material/acknowledgment snapshots after template edits.

### Materials and email

- [ ] PDF/shared link/keycode reuse across templates; unique code never assigned to two entitlements, even across inventories.
- [ ] Bulk paste validates one-per-line links, empty lines, invalid schemes, duplicate lines/global duplicates; assignment/retirement/replacement preserve history.
- [ ] Missing inventory permits payment, delivers available assets, sends attendee contact-us notice plus immediate admin alert, and creates attention item.
- [ ] Restock automatically fulfills oldest paid missing entitlements; manual assignment/restock/webhook races cannot double-assign. Email retries/resend reuse assigned codes.
- [ ] Added included material goes to paid upcoming inheriting sessions only; underway/finished/canceled/overridden sessions and historical self-paced enrollments excluded. Optional/waivable additions do not charge or fulfill old orders.
- [ ] Formatted email/subject/variables render safely with previews; purchaser receipt and individual attendee messages never leak another attendee's code.
- [ ] Configurable before/after email steps run once; late enrollment skips past steps. Schedule edit updates pending jobs even with email unchecked. Stable calendar UID updates/cancellation work.
- [ ] Failed provider response appears in attention queue; bounded retry does not duplicate financial or inventory effects. Canceled session stops pending steps and waitlist offers.

### Staff operations and privacy

- [ ] Assigned instructor can roster-search, export CSV, record per-meeting attendance, edit categorical and exam-percentage outcomes, and email selected attendees; unassigned instructor denied server-side.
- [ ] Required online/prerequisite/exam rules determine completion; missing/failed values do not pass; informational fields ignored; admin override reason audited; no instructor manual-completion bypass.
- [ ] Attendee/purchaser endpoints and emails contain no outcomes/overall completion; guessed registration IDs, session short codes, expired/tampered portal tokens, unverified account email cannot expose data.
- [ ] Purchaser sees order/attendee/payment details but not someone else's keycodes or private answers; attendee sees own materials via secure verified access.
- [ ] Admin partial/full refunds cannot exceed remaining payment; cancellation alone does not refund or recycle codes/coupons. Bulk operations track individual failures.
- [ ] Transfer equal/higher/lower prices: collect/refund/keep choice, correct capacity, old history preserved, matching materials reused, new entitlement waits for required payment.
- [ ] Waitlist FIFO, offer expiry/decline/cutoff, capacity reservation, no payment to join, no double counting or unauthorized invitation reuse.
- [ ] CSV cells neutralize formulas; email bodies escape user inputs; private pages/tokens are not cached/indexed/logged.
- [ ] Existing marketing, login, instructor-resource, Sanity Studio, eCard/product checkout, contact/corporate flows still function; native course links open published offerings.

## 9. Environment, validation, and rollout

- Use Bun and lockfile. Run `bun install --frozen-lockfile`, `bun run lint`, `bun run type-check`, behavioral tests, and `bun run build`. Do not describe lint/typecheck as payment or browser verification.
- Keep secrets out of Git and output. Next app needs existing public Convex/Sanity config; backend actions need appropriate Convex environment variables separately from `.env.local`.
- Document required existing values: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_BASE_URL`, `SITE_URL`, Stripe secret, Resend sender/key, Convex Auth Google/email/token keys as applicable. Introduce clearly named registration webhook secret and notification-recipient config with example names, no real values.
- Stripe: test-mode keys and a test webhook for the actual endpoint. Verify intended API/event version, signature handling, success/expiry/payment-failure/refund events, and separate production setup instructions. Never use real charges as a smoke test.
- Email: test inbox/provider sandbox or explicit safe test-recipient override in nonproduction. Do not email actual students while validating. Store sender/reply-to/admin notification settings so shortages reach the business immediately.
- Deploy additive Convex schema/functions to a development deployment for verification. Do not replace existing auth/products/profiles or seed fictitious live enrollments. Only regenerate Convex API types using the supported codegen workflow; do not hand-edit generated files.
- Seed a realistic test fixture: a blended three-meeting course with online/prerequisite/exam outcomes, all three material policies, scarce inventory, public/private/admin sessions, two-seat coupon, assigned/unassigned instructors, and self-paced offering.
- Exercise desktop/mobile browser flows, keyboard forms, calendar UI, email previews, webhook retries, and concurrent last-seat/coupon/code scenarios. Report observed evidence and any environment block without claiming completion.
- Launch control: prepare drafts and validate all pages before swapping public Hovn links. Keep previous product/eCard paths intact. Do not remove old data or invalidate already delivered material access when disabling new enrollment.
- End implementation with requirements coverage, tests and results, unresolved configuration tasks, and a reviewable commit/PR. No automatic production deployment, real refund, or customer email is authorized by this implementation handoff.
