# Staff material adjustments

Manual enrollment lets an administrator select course or catalog materials,
including removing materials included by default. The server uses course prices
for attached materials and the catalog default price for other materials. A
session's **+ Registration** button opens this form with that session selected.

For existing registrations, open the order, expand an attendee, and choose
**Add or remove materials**. Changes require a reason and a review step.

- Unpaid orders update their material lines and subtotal. An open invoice must
  be voided first. Orders already attached to card checkout and unpaid orders
  using coupons require cancellation and re-enrollment rather than changing an
  existing payment quote or discount allocation.
- Paid orders preserve the original purchase lines, collected tax, and refund
  limits. Removing materials cancels portal access and pending delivery without
  issuing a refund. Already-delivered codes and physical goods cannot be recalled;
  assigned codes are never recycled.
- Additions to a paid order create a separate unpaid material balance linked to
  the original order and attendee. It has its own invoice, payment, tax, and refund
  records. It creates no registration seats and changes no session capacity.
- Saving an edit never sends an invoice, requests payment, or issues a refund.
  The administrator chooses those actions separately. Invoice creation offers
  **Create draft** or **Create and send**. Partial card refunds use the payment
  controls on the original order or material balance that received the charge.
- Added materials are delivered only when the balance is settled by payment or
  an explicit waiver. Canceling an unpaid material balance leaves the registration
  active. Late payments for canceled or transferred attendees enter reconciliation.

`materialRevision` rejects stale edits. Pending balances block further edits to
the same attendee until settled or canceled. `excludedMaterialIds` preserves
staff exclusions through course-template propagation and prevents propagation
from delivering an addition before it is paid. Canceled entitlements remain in
the database for history, but active portal, staff, and mail lists use the
`by_seatId_and_state` index.

Behavioral tests cover staff-only selection, authoritative pricing, unpaid
recalculation, stale edits, invoice locks, payment replay, partial refunds,
capacity, canceled access and delivery, re-adding materials, template propagation,
and late-payment reconciliation. The browser acceptance scenario in
`tests/e2e/admin.spec.ts` uses an isolated fixture backend and saves a draft
invoice; it does not send customer mail or call live payment services.
