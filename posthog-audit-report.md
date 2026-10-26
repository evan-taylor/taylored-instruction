# PostHog Audit Report

## Summary

The audit covered both browser and server PostHog runtimes. The integration is structurally sound in several areas, but missing production token configuration, uncorrelated client/server identity, and outdated SDK traffic are correctness risks; identification timing, proxying, and growth-event coverage also need attention.

**Counts**

- **Errors**: 3 (must fix)
- **Warnings**: 4 (should fix)
- **Suggestions**: 3 (nice to have)
- **Passes**: 6

**Problematic items**

| Severity | Area | Check | File | Details |
|----------|------|-------|------|---------|
| `error` | Installation | Initialization is correct | `lib/posthog-env.ts:13` | No configured public token was found in a real env file, so production capture can no-op. |
| `error` | Identification | Same distinct_id across client and server | `lib/posthog.ts:18` | Server captures do not source the browser distinct ID through an explicit handoff. |
| `error` | Live Data | Web SDK traffic is outdated | — | PostHog reports materially outdated Web SDK traffic; upgrade affected deployments and redeploy. |
| `warning` | Identification | identify() called before captures / flag evals | `components/auth/sign-in-form.tsx:133` | `otp_verified` may fire before the asynchronous profile effect identifies the user. |
| `warning` | Event Capture | Captures route through a reverse proxy | `instrumentation-client.ts:19` | The configured host can fall back to direct PostHog ingest instead of a first-party proxy. |
| `warning` | Event Capture | Key activation events captured | `app/(app)/ecards/success/page.tsx:34` | Signup, activation completion, and purchase/subscription completion events are missing. |
| `warning` | Live Data | No reverse proxy detected | — | PostHog has not observed a reverse proxy for browser traffic. |
| `suggestion` | Installation | SDK version up to date | `package.json` | Both installed SDKs are patch releases behind the latest published versions. |
| `suggestion` | Live Data | Error alerts not wired | — | Created, reopened, and spiking error alerts are not configured. |
| `suggestion` | Live Data | Error rate limits not set | — | Project and per-issue ingestion rate limits are not configured. |

## Recommended actions

1. **Installation · Initialization is correct** — Production capture can silently no-op because no supported public token variable is set in a real environment file. _Why it matters:_ Missing initialization removes events entirely, making funnels, retention, and replay coverage incomplete. _Fix:_ Configure the real public token variable consumed at `lib/posthog-env.ts:13` in the deployment environment. See [JavaScript installation docs](https://posthog.com/docs/libraries/js).
2. **Identification · Same distinct_id across client and server** — Server captures do not receive the browser distinct ID. _Why it matters:_ Separate identifier schemes split one person into multiple records and corrupt person counts, funnels, and retention. _Fix:_ Pass the client distinct and session IDs to server actions and use them for captures associated with the same user at `lib/posthog.ts:18`. See [identifying users](https://posthog.com/docs/product-analytics/identify).
3. **Live Data · Web SDK traffic is outdated** — PostHog reports that an older Web SDK still handles a material share of recent traffic. _Why it matters:_ Old clients can emit different schemas or miss fixes, making analytics inconsistent across deployed versions. _Fix:_ Use SDK Health to locate the old deployment, upgrade it, update its lockfile, and redeploy. See [SDK installation docs](https://posthog.com/docs/libraries/js).
4. **Identification · identify() called before captures / flag evals** — `otp_verified` can be captured before the asynchronous profile effect identifies the user. _Why it matters:_ Early authenticated events can remain anonymous, fragmenting login funnels and user-level analyses. _Fix:_ Identify immediately when authenticated identity becomes available before capturing at `components/auth/sign-in-form.tsx:133`. See [identifying users](https://posthog.com/docs/product-analytics/identify).
5. **Event Capture · Captures route through a reverse proxy** — Browser ingest can fall back to the default PostHog endpoint rather than a first-party route. _Why it matters:_ Tracking blockers can drop browser events, biasing funnels, experiments, and traffic metrics. _Fix:_ Configure a first-party proxy and point `api_host` to it at `instrumentation-client.ts:19`. See [reverse proxy docs](https://posthog.com/docs/advanced/proxy).
6. **Event Capture · Key activation events captured** — Explicit signup, activation completion, and purchase/subscription completion captures are missing. _Why it matters:_ Autocapture cannot provide a stable business funnel, leaving activation and monetization analyses incomplete. _Fix:_ Add static snake_case completion events at the relevant success handlers, beginning with `app/(app)/ecards/success/page.tsx:34`. See [capturing events](https://posthog.com/docs/product-analytics/capture-events).
7. **Live Data · No reverse proxy detected** — PostHog has not observed browser events arriving through a reverse proxy. _Why it matters:_ Ad blockers can suppress events and systematically undercount users, sessions, and conversions. _Fix:_ Deploy a first-party ingest proxy, configure `api_host` and `ui_host`, then confirm proxied events arrive. See [reverse proxy docs](https://posthog.com/docs/advanced/proxy).
8. **Installation · SDK version up to date** — The declared browser and server SDK versions are behind their latest patch releases. _Why it matters:_ Delayed patch upgrades miss reliability and compatibility fixes that can affect event delivery. _Fix:_ Upgrade both PostHog dependencies in `package.json`, refresh the lockfile, and verify the build. See [JavaScript SDK docs](https://posthog.com/docs/libraries/js).
9. **Live Data · Error alerts not wired** — Error-created, reopened, and spiking alerts are not configured. _Why it matters:_ New regressions can remain undiscovered longer, delaying investigation through errors and linked replays. _Fix:_ Create alerts for all three triggers in Error Tracking settings. See [error tracking docs](https://posthog.com/docs/error-tracking).
10. **Live Data · Error rate limits not set** — Project and per-issue ingestion rate limits are absent. _Why it matters:_ A noisy exception can consume excessive volume and obscure higher-value issues. _Fix:_ Set project and per-issue limits in Error Tracking settings. See [error tracking docs](https://posthog.com/docs/error-tracking).

## Full audit

### Installation

Whether the PostHog SDK is present, current, and initialized the way the framework expects. Everything downstream depends on this: a missing or stale SDK silently changes which events exist and which config options are honoured.

| Check | Status | File | Details |
|-------|--------|------|---------|
| PostHog SDK installed | `pass` | `package.json` | posthog-js@1.438.13 and posthog-node@5.56.4 |
| SDK version up to date | `suggestion` | `package.json` | posthog-js installed 1.438.13, latest 1.438.23; posthog-node installed 5.56.4, latest 5.57.2 |
| Initialization is correct | `error` | `lib/posthog-env.ts:13` | Browser and server initialization are runtime-appropriate, but neither NEXT_PUBLIC_POSTHOG_KEY nor NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is set in a real env file, so production capture no-ops. |
| One initialization per runtime | `pass` | `instrumentation-client.ts:18; lib/posthog.ts:18` | Exactly one browser initialization and one server client constructor; no duplicate initialization within either runtime. |

#### Assumptions and blind spots

The scan checked repository manifests, initialization sites, and local env-file key presence, but not deployment-platform environment settings. Static code cannot prove which deployment receives the token or which old client bundle still sends traffic. The live outdated-SDK issue may come from a stale deployment or another integration using the same project. Verify production environment variables and SDK Health after the next deployment.

### Identification

Whether the same human maps to one stable `distinct_id` across sessions, runtimes, and logins. Identity defects are the most expensive kind to fix after the fact, because they corrupt person counts, funnels, and retention retroactively rather than going forward.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Stable distinct_id (not session UUID) | `pass` | `components/auth-effects.tsx:48` | identify() uses profile.userId, a stable authenticated user identifier after authentication is confirmed. |
| identify() called before captures / flag evals | `warning` | `components/auth/sign-in-form.tsx:133` | otp_verified is captured immediately after login while identify() waits for the asynchronous profile effect, so early authenticated events may remain anonymous. |
| Same distinct_id across client and server | `error` | `lib/posthog.ts:18` | Both browser and server initialize PostHog, but server captures do not source the browser distinct_id through a cookie, session token, or explicit handoff. |
| reset() called on logout / account switch | `pass` | `components/auth-effects.tsx:23` | Global auth effects reset PostHog on sign-out and before identifying a switched account. |

#### Assumptions and blind spots

The scan covered explicit identify, capture, initialization, logout, and account-switch paths found by static search. It cannot prove React effect timing, request ordering, or whether every server capture represents the authenticated browser user. Some server-only events may legitimately use a backend entity identifier, but user-correlated captures still need a shared ID. Verify `otp_verified` and representative server events in PostHog person timelines to confirm whether they merge into one person.

### Event Capture

Whether events are named consistently, reach PostHog reliably, and cover the moments the business actually reasons about. Gaps here don't break anything visibly; they just leave the questions you want to ask unanswerable.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Event names are static and consistent | `pass` | `providers.tsx:23` | All 24 explicit capture calls use static string literals; no dynamic event names were found. |
| Captures route through a reverse proxy | `warning` | `instrumentation-client.ts:19` | Browser api_host comes from NEXT_PUBLIC_POSTHOG_HOST, but the helper falls back to the default PostHog ingest host, so a first-party proxy is not guaranteed. |
| Key activation events captured | `warning` | `app/(app)/ecards/success/page.tsx:34` | Explicit signup, activation/first-key-action completion, and purchase/subscription completion events are missing; current events cover sign-in and checkout intent. |

#### Assumptions and blind spots

The scan checked explicit PostHog captures and likely auth, onboarding, checkout, and subscription surfaces, but framework autocapture and indirect wrapper calls may add events not visible to the search. Static configuration cannot prove whether production traffic uses a deployment-specific proxy value. Business activation may also occur on a differently named surface not matched by the growth keywords. Verify recent event names and `$lib_custom_api_host` values in PostHog, then confirm the intended signup-to-purchase funnel can be built from explicit events.

### Live Data

What PostHog itself has already flagged for this project, read from its recommendations and health checks. These come from ingested data rather than source code, so they catch problems no static scan can see — stack frames that never resolve, syncs that keep failing, alerts nobody wired up.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Open findings in PostHog | `pass` | — | 4 open findings from PostHog |
| Web SDK traffic is outdated | `error` | — | Open SDK Health, identify every in-use Web SDK version, upgrade the affected dependency or snippet, update the lockfile, and redeploy. |
| No reverse proxy detected | `warning` | — | Set up a first-party reverse proxy, point api_host and ui_host at it, and redeploy; the issue clears after proxied events arrive. |
| Error alerts not wired | `suggestion` | — | No alert is wired for: error-tracking-issue-created, error-tracking-issue-reopened, error-tracking-issue-spiking. Set them up in Error tracking → Alerts. |
| Error rate limits not set | `suggestion` | — | No ingestion rate limit set for: project, per_issue. Set them in Error tracking → Settings. |

#### Assumptions and blind spots

These findings reflect what PostHog observed in the recent lookback window, so a project that has just started sending data, or one whose findings haven't been recomputed yet, can show a clean area without being clean. The audit retained active, non-dismissed findings and did not independently re-derive their thresholds. Old SDK traffic may persist temporarily after a correct redeploy because existing sessions or another deployment still emit events. Recheck Health after fresh traffic arrives.

### Write report

This workflow check verifies that the local markdown audit artifact is created.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Create posthog-audit-report.md | `pending` | — | Awaiting completion when the ledger snapshot was rendered. |

#### Assumptions and blind spots

The row was pending in the source ledger because the report must exist before the workflow can mark it complete. Its presence in this file confirms creation, and the workflow resolves it immediately afterward.

### Upload notebook

This workflow check verifies that the local report is mirrored into a complete PostHog notebook.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Write the report into a PostHog notebook | `pending` | — | Awaiting upload when the ledger snapshot was rendered. |

#### Assumptions and blind spots

The notebook cannot be marked complete until all markdown sections are appended and read back successfully. The local report remains the source of truth if cloud notebook creation or verification fails.

## About this audit

The PostHog wizard runs this audit in stages: SDK installation → init correctness → identification → event capture → live data → this report. The early stages resolve checks against the project's source tree. The live-data stage reads what PostHog already computed from your ingested data — things no source scan can see, like whether stack frames actually resolve. Every result, pass or otherwise, is recorded in the ledger this report was generated from.

- `error` items break correctness now (events lost, identity broken). Fix first.
- `warning` items work today but cause subtle data-quality bugs. Fix when convenient.
- `suggestion` items are best-practice improvements with measurable upside.

Re-run `posthog-wizard audit` after applying fixes to refresh the ledger.
