# Package upgrade notes

Prepared October 3, 2026 on `codex/registration-plan-package-updates`.

## Scope

All direct dependencies and development dependencies were updated to registry `latest` stable releases with `bun update --latest`. `bun outdated` reports no outdated direct packages. Packages already on the latest release retain their version. The committed `bun.lock` records exact resolutions; no canary/beta versions were intentionally selected.

This is an upgrade and planning branch, not the registration implementation. The cloud-agent prompt is in `cloud-agent-handoff.md`; the approved specification and acceptance checklist are in `class-registration.md`.

## Compatibility changes

- Next.js 16.3.8, React 19.3, TypeScript 7, and current Convex/Auth packages. TypeScript no longer supports the old ES5 target; the project now targets ES2022. Node minimum is 22.12, matching the upgraded Sanity requirement; local validation used Node 26.7.0 and Bun 1.3.14.
- Added the explicit latest `@auth/core` dependency already imported by Convex auth and required by its peer contract.
- Tailwind 4 uses `@tailwindcss/postcss`, CSS imports, and an explicit reference to the existing JavaScript theme configuration. Migrated renamed utilities and removed opacity helpers. Put global defaults/components in their proper CSS layers so page utilities keep precedence. Retained the project's theme/colors and animation plugin.
- Stripe 23 uses the pinned `2026-09-30.endive` request API version and `allowed_payment_method_types` for existing card Checkout. This does not change the Stripe account's default API version. Existing Stripe Tax/promotion-code options remain. Live payment behavior was not exercised; verify test-mode commerce before deploying this major API jump.
- Sentry 11 removes `enableLogs`/`sendDefaultPii`; explicit data-collection settings preserve user/request context without adopting new outgoing-body/database/queue/local-variable payload defaults. Build validation disables Sentry uploads and Next telemetry. No source maps were intentionally uploaded.
- Zod 4 error option migration for certification validation. Lucide removed social-brand exports; use the existing react-icons package for the same footer brands.
- React UI primitives use ref props compatible with object AND callback refs. Latest lint fixes remove unused catch bindings/redundant exports, migrate string slicing and a nested condition, and retain sequential Convex mutation behavior with ordered promise chains.
- Ultracite now extends its explicit Biome core/react/next presets. Preserve existing type-alias style and object ordering. New `noJsxPropsBind` is disabled to retain established inline callbacks; `noLeakedRender` and `noUnnecessaryConditions` are disabled because they incorrectly flag boolean state/props and mutable ref guards in this code. Existing guards were preserved rather than removed to satisfy incorrect diagnostics. Other upgraded checks pass.
- Bun blocked the optional core-js postinstall message; no additional lifecycle script trust was granted.

## Validation

- `bun run test`: lint and TypeScript pass (this repository has no existing behavioral test suite).
- `bun outdated`: no outdated direct dependencies reported after final install.
- Production `bun run build` with Sentry uploads/Next telemetry disabled: passes, including static generation. The environment's initial sandboxed build did not complete; the permitted no-upload build did.
- Browser smoke and final reproducibility checks: see final validation entry below.
- No Convex schema deployment, production deployment, paid transaction, refund, or email submission was performed. The plan requires test-mode verification of those flows during implementation.

## Direct dependency versions

| Package | Previous manifest | Updated manifest |
| --- | --- | --- |
| `@auth/core` | `(new)` | `^0.41.3` |
| `@calcom/embed-react` | `^1.5.3` | `^1.5.3` |
| `@codemirror/state` | `^6.5.2` | `^6.7.6` |
| `@codemirror/view` | `^6.39.2` | `^6.43.13` |
| `@convex-dev/auth` | `^0.0.90` | `^0.0.96` |
| `@hookform/resolvers` | `^3.3.2` | `^5.9.1` |
| `@lezer/common` | `^1.4.0` | `^1.5.3` |
| `@mdxeditor/editor` | `^3.52.0` | `^4.3.2` |
| `@notionhq/client` | `^3.1.3` | `^5.27.0` |
| `@portabletext/react` | `^6.2.0` | `^8.0.1` |
| `@radix-ui/react-checkbox` | `^1.2.3` | `^1.3.11` |
| `@radix-ui/react-label` | `^2.1.4` | `^2.1.15` |
| `@radix-ui/react-radio-group` | `^1.3.4` | `^1.4.7` |
| `@react-email/components` | `^0.0.36` | `^1.0.12` |
| `@react-email/render` | `^1.0.6` | `^2.1.0` |
| `@sanity/image-url` | `^2.1.1` | `^2.1.1` |
| `@sentry/nextjs` | `^10.43.0` | `^11.4.0` |
| `@stripe/stripe-js` | `^2.2.0` | `^10.0.0` |
| `@vercel/analytics` | `^1.5.0` | `^2.0.1` |
| `@vercel/speed-insights` | `^1.2.0` | `^2.0.0` |
| `axios` | `^1.6.2` | `^1.20.0` |
| `bcryptjs` | `^2.4.3` | `^3.0.3` |
| `class-variance-authority` | `^0.7.1` | `^0.7.1` |
| `clsx` | `^2.1.1` | `^2.1.1` |
| `convex` | `^1.28.0` | `^1.46.0` |
| `lucide-react` | `^0.503.0` | `^1.51.0` |
| `next` | `16.0.9` | `16.3.8` |
| `next-sanity` | `^12.4.5` | `^13.3.4` |
| `node-html-parser` | `^7.1.0` | `^9.0.4` |
| `posthog-js` | `^1.268.9` | `^1.435.8` |
| `posthog-node` | `^5.9.2` | `^5.55.0` |
| `react` | `^19.2.0` | `^19.3.0` |
| `react-dom` | `^19.2.0` | `^19.3.0` |
| `react-email` | `^4.0.7` | `^6.11.0` |
| `react-hook-form` | `^7.47.0` | `^7.89.0` |
| `react-icons` | `^5.0.1` | `^5.7.0` |
| `resend` | `^4.4.1` | `^6.32.0` |
| `sanity` | `^5.26.0` | `^6.17.0` |
| `stripe` | `^14.8.0` | `^23.0.0` |
| `styled-components` | `^6.4.2` | `^6.5.3` |
| `tailwind-merge` | `^1.14.0` | `^3.7.0` |
| `tailwindcss-animate` | `^1.0.7` | `^1.0.7` |
| `zod` | `^3.22.4` | `^4.6.5` |
| `@biomejs/biome` | `^2.2.4` | `^2.5.15` |
| `@tailwindcss/postcss` | `(new)` | `^4.3.3` |
| `@types/node` | `^20.10.0` | `^26.6.4` |
| `@types/react` | `^19.2.2` | `^19.3.0` |
| `@types/react-dom` | `^19.2.2` | `^19.3.0` |
| `autoprefixer` | `^10.4.16` | `^10.6.1` |
| `baseline-browser-mapping` | `^2.10.31` | `^2.11.27` |
| `dotenv` | `^16.6.1` | `^18.0.5` |
| `lefthook` | `^1.13.6` | `^2.1.16` |
| `papaparse` | `^5.5.2` | `^5.7.0` |
| `postcss` | `^8.4.31` | `^8.5.28` |
| `tailwindcss` | `^3.3.5` | `^4.3.3` |
| `tsx` | `^4.7.0` | `^4.23.15` |
| `typescript` | `^5.3.2` | `^7.0.2` |
| `ultracite` | `^5.4.6` | `^7.12.2` |

## Upgrade references

- [Tailwind 4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
- [Sentry JavaScript 11 migration](https://github.com/getsentry/sentry-javascript/blob/develop/MIGRATION.md)
- Stripe installed `CHANGELOG.md` and type declarations for the Checkout payment-method field rename and pinned API version.
- Installed package manifests/type declarations for the remaining compatibility changes.

## Final validation entry

- Frozen-lockfile install passed: 1,852 installs across 1,557 packages, no changes.
- Final lint and type-check passed after compatibility/CSS fixes; Biome checked 170 files.
- Final production Turbopack build passed with Sentry upload disabled; static generation completed for 178 pages.
- Built-site smoke at `127.0.0.1:3100`: homepage rendered with corrected responsive hero typography; contact page rendered and choosing Other revealed its conditional location field; login rendered email-code and Google controls. No form was submitted and no authentication email was requested.
- Browser smoke was read-only apart from an unsent local radio selection. It does not cover authenticated checkout, real Stripe requests, email delivery, or mobile regression. Those remain release checks, especially for the Stripe major API change.
- `git diff --check` passed. All 58 direct package entries are current at this snapshot; installed versions are reproducible from `bun.lock`.

## Follow-up: Auth v2 requirement

After this stable dependency upgrade, Evan requested migration to Convex Auth v2. This preparation branch intentionally still runs the verified v1 baseline. The cloud implementation must first complete `convex-auth-v2-migration.md`, including an explicitly pinned alpha package and preserved identities/login methods. The stable-upgrade validation above is not evidence that Auth v2 has been installed, migrated, or tested.
