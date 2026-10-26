# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured with Session Replay, Error Tracking, and Support enabled. Health checks, error tracking, support tickets, and the selected Sentry responder now feed the Self-driving inbox; two Replay Vision monitors also send corroborated findings there.

New findings should begin appearing in the [Self-driving inbox](https://us.posthog.com/project/228300/inbox) within about 30 minutes.

## AI data processing

Approved.

## GitHub

Connected before this setup through the PostHog GitHub App.

## Products enabled

| Product | Status | Integration check |
|---|---|---|
| Session Replay | Already enabled | This is a web app and its `posthog.init` does not disable recording. Recent recordings exist. |
| Error Tracking | Already enabled | This is a web app and its `posthog.init` enables exception capture. Recent issues exist. |
| Support | Enabled in this setup | The Support responder is enabled. Tickets require an inbound email, inbox, or Slack channel before they can arrive. |

## Signal sources

| Signal source | Action | Notes |
|---|---|---|
| `health_checks` / `health_issue` | Enabled | Watches PostHog setup and instrumentation health. |
| `error_tracking` / `issue_created` | Enabled | Emits newly detected error issues. |
| `error_tracking` / `issue_reopened` | Enabled | Emits recurrent error issues. |
| `error_tracking` / `issue_spiking` | Enabled | Emits sharply increasing error issues. |
| `conversations` / `ticket` | Enabled | Idle until a Support inbound channel is connected. |
| `signals_scout` / `cross_source_issue` | On by default | No source row is required; scout findings enter the inbox by default. |
| `sentry` / `issue` | Enabled, dormant | Selected by the user; it starts emitting when a Sentry warehouse source is connected. |
| `logs` / `alert_state_change` | Skipped | No Logs usage was established. |
| `endpoints` / `endpoint_execution_failed` and `endpoint_breakdown_limit_exceeded` | Skipped | Endpoint usage could not be confirmed. |
| `session_replay` / `session_analysis_cluster` | Skipped intentionally | Replay coverage is provided by Replay Vision scanners below; this retired source is not used. |

## Connected tools

| Tool | Status |
|---|---|
| Sentry | Selected, but no warehouse source was connected. The responder is enabled and remains dormant until a source is added and syncing. |
| GitHub Issues | Not selected for an inbox responder. The GitHub App was already connected. |
| Linear, Jira, Zendesk, and all other offered tools | Not used. |

## Scout troop

**Enabled troop (5):**

- **General** — cross-product patterns that no specialist owns.
- **Product analytics** — core flow behavior and derived-rate changes.
- **Web analytics** — traffic, attribution, landing-page health, and 404/bounce patterns.
- **Revenue analytics** — revenue telemetry and revenue configuration health.
- **Data warehouse** — external source freshness, sync failures, and schema health.

**Operational scout (1):** Inbox validation remains enabled. It runs report follow-up checks and sits outside the normal troop ceiling.

**Disabled scouts (23):**

- AI observability — no LLM analytics evidence.
- Anomaly detection — not selected over confirmed product surfaces.
- APM — no tracing evidence.
- Conversations — Support has no inbound-ticket activity yet; native ticket source owns the route.
- CSP violations — no CSP reporting evidence.
- Customer analytics — no account-analytics evidence.
- Data pipelines — no CDP, batch-export, or Hog Flow evidence.
- Error tracking — covered by native Error Tracking responders.
- Experiments — no active experiment evidence.
- Feature flags — no active-use evidence.
- Insight alerts — no configured-alert evidence.
- Logs — no Logs product evidence.
- MCP tool calls — no product MCP telemetry evidence.
- Observability gaps — not selected over confirmed product surfaces.
- PR follow-up — no requirement for deployment follow-up coverage.
- Replay Vision — no pre-existing scanner observations existed when the troop was selected.
- Session replay — covered by the Replay Vision scanners below.
- Skills store — no project skills-store workflow evidence.
- Surveys — no surveys exist.
- Tasks — no project Tasks evidence.
- Unused features — not selected over confirmed product surfaces.
- Web vitals — no verified Web Vitals event evidence.
- Workflows — no workflow activity evidence.

**Capacity:** 100 runs per day; 0 used and 100 remaining when configured. The enabled-scout cap is 250; one operational scout occupied a reserved slot, leaving 249 slots for non-operational scouts. The early-access banner says: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

## Custom scouts

No custom scouts were created. Two tailored candidates were proposed and declined:

- **eCard checkout health** — would have watched the eCard purchase journey for checkout failure and payment-handoff regressions; it is a domain-specific complement to the general revenue scout.
- **Sign-in health** — would have watched email-code and Google sign-in conversion for broad failure patterns.

The core analytics, web, revenue, warehouse, error-tracking, and replay surfaces are already covered by the enabled troop or their dedicated inbox pipelines. If a future custom scout becomes noisy, set its `emit` setting to `false` in PostHog to run it in dry-run mode.

## Replay Vision scanners

A Replay Vision scanner is an LLM that watches individual session recordings on a schedule and pushes confirmed findings to the inbox. These are the only components in this setup that consume Replay Vision quota; each finding enters at half weight and requires corroboration before it is promoted into an inbox report.

| Monitor | Status | Watches | Query scope | Sampling | Estimated usage |
|---|---|---|---|---:|---:|
| **eCard checkout breakage** | Created | Visible breakage while buying eCards, including failed payment handoffs, nonresponsive cart actions, and missing confirmations. | Recordings that visit `/ecards`, the checkout flow identified in `app/(app)/ecards/page.tsx`. | 50% | ~4 observations/month, ~20 credits/month |
| **Training flow frustration** | Created | Clear on-screen struggle during eCard, sign-in, registration, contact, or group-training flows. | Sessions with a `$rageclick` event only. | 100% | ~4 observations/month, ~20 credits/month |

The two monitors were estimated at about 40 credits per month combined. The organization had 7,474 credits remaining when configured, so no additional confirmation was required.

## Files modified or created

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files were changed.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so Support tickets can begin reaching the enabled responder.
- [ ] Add the selected Sentry warehouse source from [New data warehouse source](https://us.posthog.com/project/228300/pipeline/new/source). The enabled Sentry responder will begin working when that source syncs.
- [ ] This checkout has no local `NEXT_PUBLIC_POSTHOG_KEY` or `NEXT_PUBLIC_POSTHOG_HOST` environment values detected. Confirm the deployment environment supplies them; the project is receiving replay data, but this local checkout cannot verify their configured values.
- [ ] Review and rate the first Replay Vision observations from the two monitors so their prompts can be refined over time.

## What happens next

The scout coordinator picks up fresh configurations within about 30 minutes. Scout runs use the project’s daily budget; findings cluster into reports in the Self-driving inbox, and immediately actionable reports can begin coding tasks.
