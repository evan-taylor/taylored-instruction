# Registration implementation coverage

Based on the approved plan. Checkboxes indicate implementation with local automated evidence. Provider and full staff-browser acceptance are separately listed below; a checked item is not a claim of production verification.

Auth decision: on October 3, 2026 the user directed retaining Auth v1 pending upstream OTP support. Auth v2 acceptance is deferred by that decision; Google and email-code login must remain intact.



### Authentication prerequisite

- [x] Authentication decision resolved: retain Auth v1 per Evan; Auth v2 migration is deferred pending upstream OTP support. Existing providers and identities are preserved.

### Templates and scheduling

- [x] Template CRUD/publication and duplicate; exactly one delivery type.
- [x] Single/multi-meeting sessions with physical/online/both locations; timezone/DST-aware recurring preview creates independent sessions and unique short links.
- [x] Inherited fields change when template changes; explicit false/zero/empty overrides survive; reset restores inheritance.
- [x] Public lists exclude drafts/private/admin-only. All session short links remain stable after edits; admin-only links reject anonymous access; canceled links show status without accepting payment.
- [x] Registration cutoff prevents public purchase; authorized admin can enroll afterward/overbook explicitly.

### Checkout, pricing, and payment

- [x] Purchaser buys for self and multiple other named attendees in one session; missing names/emails and duplicate normalized emails rejected, including concurrent requests.
- [x] Another session accepts the same email; self-paced repeat purchase warns but succeeds as new enrollment; duplicate email within one order fails.
- [x] Included material cannot be waived; optional adds price; required-waivable defaults included and exact acknowledgment removes price and entitlement per attendee.
- [x] Example: tuition $100, included material $10, waivable $20, optional $15: default $130; waive -> $110; waive + optional -> $125. Tuition-only 100% coupon leaves $25 in the last case; all-material 100% yields $0.
- [x] Two-use 100% coupon discounts exactly two of three seats; third charged. Concurrent checkouts cannot reserve/consume more than two uses. Fixed discounts cap at eligible subtotal, with deterministic cents/rounding.
- [x] Expired/wrong-course/disabled coupons rejected; expired checkout releases reservations; refund does not restore; explicit admin restoration works exactly once.
- [x] Free/fully discounted/offline/waived completion needs no card and uses the same entitlement finalizer. Unpaid admin enrollment withholds materials and reserves capacity.
- [x] Stripe signed success fulfills once; invalid signature/amount/currency rejected; duplicate/out-of-order event safe; redirect alone cannot fulfill; late payment handled without overselling.
- [x] Last-seat parallel checkouts allow one hold only. Expiry and waitlist conversion free/exchange seats correctly. No abandoned hold leaks indefinitely.
- [x] Paid order preserves financial/material/acknowledgment snapshots after template edits.

### Materials and email

- [x] PDF/shared link/keycode reuse across templates; unique code never assigned to two entitlements, even across inventories.
- [x] Bulk paste validates one-per-line links, empty lines, invalid schemes, duplicate lines/global duplicates; assignment/retirement/replacement preserve history.
- [x] Missing inventory permits payment, delivers available assets, sends attendee contact-us notice plus immediate admin alert, and creates attention item.
- [x] Restock automatically fulfills oldest paid missing entitlements; manual assignment/restock/webhook races cannot double-assign. Email retries/resend reuse assigned codes.
- [x] Added included material goes to paid upcoming inheriting sessions only; underway/finished/canceled/overridden sessions and historical self-paced enrollments excluded. Optional/waivable additions do not charge or fulfill old orders.
- [x] Formatted email/subject/variables render safely with previews; purchaser receipt and individual attendee messages never leak another attendee's code.
- [x] Configurable before/after email steps run once; late enrollment skips past steps. Schedule edit updates pending jobs even with email unchecked. Stable calendar UID updates/cancellation work.
- [x] Failed provider response appears in attention queue; bounded retry does not duplicate financial or inventory effects. Canceled session stops pending steps and waitlist offers.

### Staff operations and privacy

- [x] Assigned instructor can roster-search, export CSV, record per-meeting attendance, edit categorical and exam-percentage outcomes, and email selected attendees; unassigned instructor denied server-side.
- [x] Required online/prerequisite/exam rules determine completion; missing/failed values do not pass; informational fields ignored; admin override reason audited; no instructor manual-completion bypass.
- [x] Attendee/purchaser endpoints and emails contain no outcomes/overall completion; guessed registration IDs, session short codes, expired/tampered portal tokens, unverified account email cannot expose data.
- [x] Purchaser sees order/attendee/payment details but not someone else's keycodes or private answers; attendee sees own materials via secure verified access.
- [x] Admin partial/full refunds cannot exceed remaining payment; cancellation alone does not refund or recycle codes/coupons. Bulk operations track individual failures.
- [x] Transfer equal/higher/lower prices: collect/refund/keep choice, correct capacity, old history preserved, matching materials reused, new entitlement waits for required payment.
- [x] Waitlist FIFO, offer expiry/decline/cutoff, capacity reservation, no payment to join, no double counting or unauthorized invitation reuse.
- [x] CSV cells neutralize formulas; email bodies escape user inputs; private pages/tokens are not cached/indexed/logged.
- [x] Existing marketing, login, instructor-resource, Sanity Studio, eCard/product checkout, contact/corporate flows still function; native course links open published offerings.


## Evidence and outstanding acceptance

The implementation entry points are `convex/registration*.ts`, `shared/registration/`, and `components/registration/`. Automated evidence is in `tests/registration/backend.test.ts` (24 passing tests) and `tests/e2e/registration.spec.ts` (10 passing desktop/mobile tests). [Validation and setup](registration-validation.md) records the tested environment and exact remaining boundaries.

- [ ] Hosted Stripe test Checkout/refund and real provider webhook delivery: dedicated working test-service configuration is needed. HMAC verification, transaction finalization, refund reservations, and replay behavior pass locally.
- [ ] Actual delivery to the configured safe email recipient, calendar-client rendering and authenticated provider login: credentials/setup are needed. Outbox leases/retries, access exchange and browser login rendering pass locally.
- [ ] End-to-end authenticated staff browser acceptance across every admin/instructor editor, and existing authenticated eCard/product/Studio/instructor-resource flows. Backend role/authorization behavior is tested; these browser workflows require verified development identities/provider setup.
- [ ] Confirm registration tax policy. Automatic-tax support is not enabled; if required by the account's policy, it is a release blocker requiring implementation.
- [ ] Publish reviewed native offerings and enable the marketing launch flag after acceptance. No production deployment or live-service enablement was performed.

The full plan's provider acceptance is therefore **not yet certified complete**. These unchecked items must not be represented as completed tests or production readiness.

## Group training, invoicing, and admin experience (October 14, 2026)

Scope added after the original plan so the website can fully replace Hovn for group and corporate training. Checked items have local automated evidence in `tests/registration/backend.test.ts`; browser acceptance remains listed below.

### Group training
- [x] Public group-training request page (`/group-training`) stores requests, rate-limits by email, and queues a staff alert with a deep link to the admin queue.
- [x] Admin request queue with status workflow (new → contacted → quoted → scheduled → closed), internal notes, organization linking, and "start group enrollment" prefill.
- [x] Organizations (billing contact, address, notes, archive) linked to orders and invoices; organization order history.
- [x] Group enrollment wizard: scheduled session or self-paced course, pasted roster parsing (name/email in common formats, duplicate and missing-field detection), capacity check with audited overbook, group-wide material choices and question answers, optional coupon, negotiated per-seat price with required pricing note, purchaser and organization, and payment handling (invoice, offline, waived, hold unpaid). Staff orders allow up to 100 attendees; public checkout stays at 20.
- [x] Custom group tuition is recorded on the order snapshot and audit log; public checkout cannot set it.

### Invoicing
- [x] Sequential invoice numbers (`TI-YYYY-NNNN`) from a transactional counter; one open invoice per order; invoices only for unpaid orders with a nonzero total.
- [x] Hosted Stripe invoice (send-invoice collection, due date, PO number and invoice number as custom fields, line items from the immutable order snapshot) created, finalized, and emailed through the durable outbox with a pay link; idempotency keys on every provider call; provider total verified against the order.
- [x] `invoice.paid` webhook settles the order through the shared finalizer exactly once (amount/currency verified, event-id deduplicated, payment intent captured for refunds). `invoice.voided` / `invoice.marked_uncollectible` close the local invoice.
- [x] Offline invoice payment (check, ACH) settles through the same finalizer and closes the hosted invoice so it cannot be paid twice; void keeps the order awaiting payment; card payment links are blocked while an invoice is open; paid invoices cannot be voided.
- [x] Reminders and overdue detection; overdue invoices and new group requests appear in the attention queue and dashboard.

### Admin experience
- [x] Admin shell with grouped navigation, attention badge, admin gating (backend remains authoritative), and a dashboard (30-day revenue and seats, upcoming sessions and fill, awaiting payment, open/overdue invoices, attention list, low keycode stock, next sessions, recent orders, audit feed).
- [x] All registration admin pages rebuilt on shared primitives: tables with status badges, modal editors, confirm-with-reason dialogs for every financial or destructive action, dollar inputs, zone-aware date inputs, deep links (`?new=1`, `?session=`, `?order=`, `?tab=`), loading and empty states.
- [x] Session cancellation now requires and records a reason (the previous UI never populated it).
- [x] Admin lookup by email across purchasers and attendees; single-order query for deep links; state-filtered keycode stock query.
- [x] Public discovery, session detail/checkout, success, portal, and instructor screens restyled while preserving every e2e-tested label and flow.

### Outstanding acceptance for this scope
- [ ] Hosted Stripe test invoice end to end: issue, open the hosted page, pay with a test card, confirm `invoice.paid` delivery and settlement, void, and offline-payment close. Requires the development Stripe endpoint subscribed to `invoice.paid`, `invoice.voided`, and `invoice.marked_uncollectible` in addition to the existing events.
- [ ] Browser acceptance of the rebuilt admin, public, and instructor screens against a development Convex deployment. The cloud workspace used for this change cannot run the local Convex backend (its binary requires a newer glibc than Amazon Linux 2023 provides), so only lint, type-check, and the behavioral suite ran here.
- [ ] Decide whether Stripe Tax applies to invoices; automatic tax is disabled on test invoices exactly as on Checkout.
