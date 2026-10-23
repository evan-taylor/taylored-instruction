# Agent access (MCP)

The admin workspace is exposed to AI agents through a Model Context Protocol
server at `/api/mcp` (Streamable HTTP, MCP SDK 1.32). An agent with a token can
do everything the admin dashboard and instructor workspace can do: manage course
templates and sessions, enroll and bill attendees, refund and cancel, run
materials and keycode inventory, approve instructors, and edit SEO pages. The
Sanity content studio is a separate CMS and is not covered.

## Setup

1. Sign in as an administrator and open **Admin → Agent access**.
2. Create a token with a label. The plaintext is shown once.
3. Add the server to a client. The page shows ready-to-copy snippets:

```sh
claude mcp add --transport http taylored https://tayloredinstruction.com/api/mcp \
  --header "Authorization: Bearer ti_mcp_…"
```

```json
{
  "mcpServers": {
    "taylored": {
      "type": "http",
      "url": "https://tayloredinstruction.com/api/mcp",
      "headers": { "Authorization": "Bearer ti_mcp_…" }
    }
  }
}
```

Use the preview or local origin for a test backend. Revoke a token from the
same page; the agent loses access on its next request.

## How authentication works

- `convex/mcp.ts` stores a SHA-256 hash of each token in `mcpTokens` with the
  owning administrator. Only `ADMIN_EMAILS` accounts can mint tokens.
- `app/api/mcp/route.ts` reads the bearer token and calls `mcp.exchange` on
  every request, which validates the hash, creates or extends an `authSessions`
  row, and signs a five-minute Convex Auth JWT with the deployment's
  `JWT_PRIVATE_KEY`. Revoking a token therefore refuses the agent's next call;
  a JWT already in flight expires within minutes.
- The route then calls the public Convex functions with that JWT, so every
  existing `staff()` check, audit entry, test/live payment guard, and email
  redirect applies exactly as it does for the browser.
- Requests are stateless (no MCP session id). Server-initiated notifications
  between requests are not available on serverless hosting.

No new environment variables are required: Next.js needs
`NEXT_PUBLIC_CONVEX_URL` and Convex needs `JWT_PRIVATE_KEY` and
`CONVEX_SITE_URL`, all of which already exist for Convex Auth.

## Surface

Code lives in `lib/mcp`. Tools are grouped by file and carry MCP annotations
(read-only, destructive, open-world for tools that send email or move money):

| File | Tools |
| --- | --- |
| `tools/overview.ts` | whoami, dashboard_summary, attention_queue, activity_log, email_queue, retry_email, send_test_email, get_record, offering_detail |
| `tools/catalog.ts` | list/get/save/duplicate/delete course, list sessions, session_overview, plan_meetings, save_session, cancel_session, session_roster, export_roster_csv, email_attendees, session files, locations, search_offerings |
| `tools/registrations.ts` | list_orders, get_order, lookup_customer, enroll, request_payment_email, record_offline_payment, restore_coupon, refund_order, cancel_seat, transfer_preview/transfer_seat, seat_materials, resend_materials, replace_keycode, fulfill_physical, keycode_history, seat_outcomes, record_attendance, record_outcome, override_completion, waitlist_add |
| `tools/sales.ts` | coupons, group requests, organizations, invoices (create/issue/record payment/void/remind), stripe_tax_codes |
| `tools/fulfillment.ts` | materials (with PDF upload), keycode_stock, add_keycodes, missing_materials, manage_keycode |
| `tools/people.ts` | invite_instructor, list_instructor_invitations, revoke_instructor_invitation, staff_directory, list_instructor_profiles, list_users, set_instructor_approval, deactivate_user, delete_profile |
| `tools/content.ts` | SEO pages list/get/upsert/delete/generate |

Resources: `taylored://guide` (operations handbook), `taylored://dashboard`,
`taylored://attention`, `taylored://courses`, `taylored://sessions/upcoming`,
`taylored://locations`, `taylored://staff`, and templates for
`taylored://sessions/{sessionId}`, `taylored://sessions/{sessionId}/roster.csv`,
and `taylored://orders/{orderId}`.

Prompts: `morning_review`, `enroll_group`, `close_out_session`,
`handle_refund`, `schedule_sessions`.

Update-style tools (`save_course`, `save_session`, `save_coupon`,
`save_organization`, `save_material`, `update_group_request`) accept partial
input when an id is given and merge it over the stored record; array fields
replace the stored array only when supplied, and `save_session` takes
`clearOverrides` to drop session overrides. Tools that send email or move money
(`enroll`, `refund_order`, `transfer_seat`, `request_payment_email`,
`email_attendees`, `resend_materials`, `send_test_email`) accept an
`operationKey`; pass the same key when retrying so the backend recognizes the
retry instead of repeating it. Dates accept epoch milliseconds or ISO 8601.
Money is integer cents.

## Validation

`tests/registration/mcp.test.ts` covers token minting, exchange, JWT
verification, revocation, and admin-only reads. `tests/registration/mcp-server.test.ts`
drives the server over an in-memory transport with a scripted Convex client and
checks the tool surface, argument mapping, error handling, and partial merges.
Neither exercises a live Convex deployment, Stripe, or email.

## Editing formatted emails

Use `get_course` followed by `save_course` to update
`settings.confirmationEmail` (both `subject` and `body`) or `settings.emails`
(the complete scheduled-message array, retaining existing step IDs). Omitted
settings are preserved. Confirmation changes affect future queued confirmations.

For one session, use `save_session` with `overrides.confirmationEmail` or
`overrides.emails`. To restore the course confirmation, pass
`clearOverrides: ["confirmationEmail"]`.

Bodies support Markdown: `**bold**`, `*italic*`, `++underline++`,
`[label](https://example.com)`, bulleted and numbered lists, and nested lists
indented four spaces. HTML is displayed as text. Supported merge fields are
`{{attendeeName}}`, `{{courseTitle}}`, `{{meetingDates}}`, `{{materials}}`,
and `{{portalLink}}`. The mailer appends schedule, materials, and portal access.

Example `save_course` settings:

```json
{
  "confirmationEmail": {
    "subject": "You're registered for {{courseTitle}}",
    "body": "Hi {{attendeeName}},\n\n- **Bring identification**\n    - ++Photo ID required++\n\n1. Review your materials\n2. Arrive early"
  }
}
```

`email_attendees` and `send_test_email` accept the same body formatting.
For a standalone test email, replace merge fields with sample values;
`send_test_email` only accepts the configured safe test recipient.
