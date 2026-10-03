# Convex Auth v2 migration

Added to the approved registration scope on October 3, 2026 at Evan's explicit request. This is the cloud agent's first implementation phase, before building registration identity and permissions. The preparation branch still runs Auth v1; updating its stable package did not implement v2.

## Verified upstream status

Read these sources again when implementing, since preview APIs can change:

- [Getting started](https://auth-v2.previews.convex.dev/getting-started): installs `@convex-dev/auth@alpha`, with development/preview packaging; setup initializes `convex/auth.ts`, `convex/auth.config.ts`, and `convex/convex.config.ts`, and uses `AUTH_PRIVATE_KEY` and `AUTH_JWKS`.
- [Migration from v1](https://auth-v2.previews.convex.dev/migrating/from-convex-auth-v1): currently a WIP placeholder, not an executable migration procedure. Do not claim an official automatic data migration exists.
- [Google OAuth](https://auth-v2.previews.convex.dev/login-providers/oauth): component-based Google support, explicit application-user callbacks, provider-specific client hooks, and redirect-origin controls.
- [Next.js server API](https://auth-v2.previews.convex.dev/api/nextjs/server): `setupConvexAuthNextjs` creates proxy, server-provider, access-token, and verified-auth helpers. Framework-agnostic route handlers handle sign-in/refresh/sign-out.
- [Email/password provider](https://auth-v2.previews.convex.dev/login-providers/email-password): documents validated-email/password login, not a replacement for the current six-digit passwordless email-code flow.
- [Source branch](https://github.com/get-convex/convex-auth/tree/reboot): inspect the exact installed revision and provider/component APIs when guidance is incomplete.

The preview documentation explicitly says v2 is alpha and should not yet be used in production. The user's request authorizes implementation of the migration on a development branch/deployment; it does not authorize a production cutover, key rotation, destructive data migration, or changing existing login methods. Record the exact resolved alpha version/revision and integrity in the lockfile. This is an intentional exception to the earlier stable-only dependency upgrade, not permission to adopt unrelated prereleases.

## Preserve the application's identity and access

- Keep existing application user IDs, profile records, instructor approvals, admin access, analytics ownership, onboarding, and migration attachments intact. Registration ownership must refer to stable application identities, not ephemeral provider credential/account IDs.
- Current schema spreads v1 `authTables` into the application and uses `v.id("users")` throughout profiles, analytics, and staging profiles. V2 core/providers own credential/session state in components while the application maintains its users table. Define an explicit compatible users schema, including existing optional profile fields and indexes required by source code. Never replace existing users with an empty table or bulk-create duplicates from the example snippets.
- Inventory existing user/account/provider relationships on a development copy or sanitized fixture. Design a resumable, idempotent identity map from existing provider identifiers to the existing application user IDs, with duplicate/ambiguous cases reported rather than silently merged.
- Reuse a user only from verified provider identity or proven email ownership under a clearly tested linking policy. Matching a supplied email string is not sufficient. Preserve the admin allowlist behavior, but require verified identity before its email can grant access. Existing instructor approval never grants admin status or access to unassigned sessions.
- Preserve Google sign-in and passwordless email-code login. Do not silently replace OTP with passwords or require accounts for guest checkout. The documented email/password flow does not establish passwordless OTP support. Inspect the pinned v2 package/source for a supported email challenge/provider mechanism; adapt using documented v2 primitives if available, with expiry, replay protection, rate limits, and verified-email binding. If no supported implementation can preserve this, report the concrete gap and request a provider decision before changing login UX; finish independent migration work without claiming completion.
- Guest registration email links remain purpose-scoped attendee/purchaser grants. They must not mint global admin/instructor authority. Keep them distinct from same-browser email validation challenges and from public session short links.

## Implementation worklist

1. **Pin and inspect v2 in development.** Install the current alpha using Bun, record exact resolution, review peer requirements and exports, and inspect the setup CLI before running it. The setup command writes files and deployment secrets: do not run it blindly against the production-linked checkout. Generate/configure only development keys, without logging them. Keep production credentials unchanged and document later cutover steps.
2. **Component registration and backend.** Add `convex/convex.config.ts` registering auth core and the required providers. Wire `setupCore`, provider callbacks, sign-out/refresh/isAuthenticated functions, compatible application users schema, auth issuer configuration, and HTTP callbacks. Use actual generated component names. Regenerate Convex types normally; do not hand-edit generated files.
3. **Google provider.** Replace Auth.js Google configuration with v2 `setupGoogle` and its component. The guide uses `AUTH_GOOGLE_CLIENT_ID`/`AUTH_GOOGLE_CLIENT_SECRET` and `/oauth/google/callback` under the deployment's `convex.site` host. Existing names are `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`; document a deliberate environment mapping, development callback registration, and rollback rather than changing production values. Use explicit trusted frontend redirect origins; reject arbitrary redirect destinations.
4. **Next.js SSR/client integration.** Centralize `setupConvexAuthNextjs` with `api.auth.refreshSession` and `api.auth.isAuthenticated`. Migrate `proxy.ts` to its v2 proxy helper while preserving existing canonical/legacy redirects, Studio behavior, protected routes, and public guest/short-link routes. Replace server/client provider wiring and auth route handlers according to the pinned v2 Next.js API, not Vite-only examples.
5. **Token and authorization consumers.** Migrate all v1 `auth.getUserId`, `getAuthUserId`, token hooks, and server helpers to v2 identity resolution. The v2 access-token helper only performs a local expiry check: it is suitable to forward to Convex, not evidence of authorization. Use backend-verified authentication and server-side role/session-assignment checks for privileged actions.
6. **UI flows.** Adapt login, resend/verification, Google callback completion/error recovery, logout, account UI, header state, profile hooks, and auth effects. Confirm cookie refresh and hydration work together with Next.js Cache Components. Do not leak token/query values through debug endpoints or analytics. Remove/sanitize the existing debug-auth route's token/cookie reporting as part of migration.
7. **Data migration and cutover tooling.** Provide a dry-run report, validation counts, explicit source-to-target mapping, checkpoints, retry semantics, and recovery instructions. Preserve old tables/data until migration validation and production cutover are separately authorized. Assume old sessions may require reauthentication unless compatibility is demonstrated; do not copy opaque v1 refresh tokens into v2. Check rollback with both old and new identity references intact.
8. **Dependency cleanup and documentation.** Remove `@auth/core` and other v1-only integrations only when no longer imported. Update env examples, current architecture guidance, and the registration plan's prerequisite notes. Keep registration Stripe/Resend behavior and the upgraded dependency baseline intact.

## Source audit checklist

- Backend: `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`, `convex/schema.ts`, `convex/ResendOTP.ts`, `convex/profiles.ts`, `convex/admin.ts`, `convex/products.ts`, `convex/analytics.ts`, `convex/onboarding.ts`, `convex/migration.ts`, and `convex/seoContent.ts`.
- Next.js: `proxy.ts`, `providers/ConvexClientProvider.tsx`, both app/marketing layouts, admin SEO layout, login, my-account, debug-auth, and `components/layout/Header.tsx`.
- Shared consumers: `hooks/useProfile.ts`, `hooks/useMigrationAttachment.ts`, `components/auth-effects.tsx`, admin-email checks, and all newly added registration permission checks.
- Rerun a repository-wide import/helper search at implementation time; this list is not a substitute for coverage.

## Acceptance criteria before calling the migration complete

- [ ] Exact alpha version is pinned/reproducible; component generation, lint, type-check, build, and development deployment pass.
- [ ] Existing Google users resolve to the same application user/profile; approved instructors and admins retain the correct roles; new users get no elevated permissions.
- [ ] Existing passwordless email-code login works, including expired/wrong/replayed code, resend, throttling, and safe error messages. If upstream cannot support it, migration remains explicitly blocked on that requirement rather than silently adding passwords.
- [ ] Google sign-in/callback cancellation/expired flow and rejected redirect origin are tested against development configuration.
- [ ] SSR, hydration, client navigation, access-token expiry, refresh, logout/reload, and multiple tabs agree on authentication; expired/revoked/forged cookies do not authorize backend actions.
- [ ] Verified account linking cannot hijack an existing profile or registration with an unverified matching email; ambiguity fails closed and is reviewable.
- [ ] Admin/instructor/student/purchaser/guest authorization tests cover identity and role preservation, assigned-session restrictions, and private materials/outcomes.
- [ ] Guest checkout remains account-optional; secure portal links work without granting staff powers; session short links remain public/unlisted/restricted according to session visibility.
- [ ] Migration dry run, rerun, partial failure recovery, mapping counts, and rollback are tested using development fixtures. No existing user IDs/profile links are lost or duplicated.
- [ ] Remaining production settings, callback changes, user reauthentication expectations, alpha-readiness constraints, and rollback procedure are documented. No production cutover is executed by the cloud implementation task.
