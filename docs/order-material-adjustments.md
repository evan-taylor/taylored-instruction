# Staff material adjustments

Manual enrollment lets an administrator select course or catalog materials,
including removing materials included by default. The server uses course prices
for attached materials and the catalog default price for other materials. A
session's **+ Registration** button opens this form with that session selected.

For existing registrations, open the order, expand an attendee, and choose
**Add or remove materials**. Changes require a reason and a review step.

- Unpaid transfer balances must be settled before material edits to preserve
  transfer credit. Other unpaid orders update their material lines and subtotal. An open invoice must
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

`materialRevision` rejects stale edits. Each successful edit also records its
operation key, normalized input, and result in `registrationMaterialEdits`.
Identical retries return that result (including no balance) without repeating
side effects, even after later edits. Reusing a key with different input fails.
Pending balances block further edits to
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

Same-course transfers use the current material selection and preserve staff
exclusions. Transfer credit and refunds include separately paid material balances
and their allocated refunds while preserving original payment records. Payments
received after session cancellation are recorded for reconciliation rather than
delivering materials. Course propagation advances the order material revision so
an already-open editor cannot silently remove newly added materials.
When a destination replaces a material under an existing attachment ID, its row
takes precedence; the source material is not carried as a duplicate row.

MCP exposes the same workflows through `enroll.materialIds`,
`order_material_selection`, `edit_order_materials`, `order_material_balances`,
and `cancel_material_balance`. Invoice creation defaults to a draft; sending,
payment/waiver, and partial refunds remain explicit separate actions.
