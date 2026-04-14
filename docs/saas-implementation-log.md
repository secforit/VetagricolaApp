# SaaS Implementation Log

## 2026-04-12 - Phase 1 foundation

- Added tenant/session domain types for clinic roles, clinic status, and authenticated app sessions.
- Reworked Supabase helpers into `getAdminDb()` for service-role work and `createUserDbClient()` for request-scoped user sessions.
- Added tenant helpers to resolve the active clinic context, calculate clinic access state, and provision admin MFA factors.
- Replaced the old shared-auth helper with cookie-based session utilities that support:
  - app JWT session cookies
  - pending MFA cookies
  - Supabase access and refresh token cookies
  - request-scoped auth context loading for future clinic-safe API routes

### Notes

- This foundation assumes a new `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var will exist.
- The next implementation chunk will wire these helpers into login, registration, 2FA, and clinic-scoped CRUD routes.

## 2026-04-12 - Registration and MFA flow

- Replaced the old shared `username/password` login route with Supabase email/password authentication.
- Added clinic self-registration at `/register` with Romanian legal fields, trial initialization, owner membership creation, and profile/bootstrap records.
- Kept mandatory MFA for `clinic_admin` accounts by:
  - provisioning a per-user TOTP factor
  - issuing a pending MFA cookie after password auth
  - verifying the code before creating the app session cookie
- Updated the login and MFA screens to reflect the new CanisVET flow.

### Notes

- The registration route currently creates the admin user directly with the service role and marks email as confirmed so phase 1 can move forward before SMTP verification is wired in.
- The next chunk will connect these sessions to the protected app shell, proxy, and clinic-scoped CRUD routes.

## 2026-04-12 - App shell and clinic scoping

- Moved protected CRUD routes and dashboard counts onto the new request auth context so every business table is scoped by `clinic_id`.
- Updated the protected app layout and sidebar to read the authenticated clinic session instead of using hardcoded clinic branding.
- Updated the edge proxy so registration, legal pages, pending MFA, and authenticated app access all follow the new cookie model.
- Added placeholder legal pages for terms, privacy, and DPA so the signup flow has stable destinations.

### Notes

- The business APIs now assume the multi-tenant migration has been applied and the core tables have a `clinic_id` column.
- The remaining major phase-1 step is the SQL migration and validation pass.

## 2026-04-12 - Database migration and RLS scaffold

- Added the first Supabase migration for multi-tenancy under `supabase/migrations/20260412_phase1_multitenancy.sql`.
- The migration introduces:
  - `clinics`, `profiles`, `user_clinics`, `clinic_invites`, `clinic_settings`
  - `billing_events`, `audit_logs`, `auth_mfa_factors`, `auth_log`
  - `clinic_id` on all business tables with a legacy clinic backfill
  - helper functions and RLS policies for clinic membership, admin checks, and trial-cap enforcement

### Notes

- The legacy data is backfilled into a fixed placeholder clinic ID so the existing records remain queryable after the migration.
- Before production rollout, this migration needs a staging rehearsal against the real Supabase project because it changes access patterns for every business table.

## 2026-04-12 - Validation snapshot

- Targeted ESLint pass succeeded for the files changed in phase 1.
- `tsc --noEmit` succeeded for the project.
- Production build succeeded with `next build --webpack` using placeholder env values for the Supabase and auth secrets.

### Notes

- The default `npm run lint` command still reports thousands of unrelated issues because it scans generated `.next` output and `.claude/worktrees`; that was not changed in this phase.
- The default `next build` path on this machine hit a Turbopack sandbox panic, so webpack was used for verification instead.

## 2026-04-12 - Local database workflow

- Added baseline table creation to the phase-1 migration so a fresh local database can be built from migrations alone.
- Added `supabase/config.toml` and `supabase/seed.sql` so the repo has a concrete local Supabase layout.
- Added local DB helper scripts in `package.json` for start, stop, status, reset, and push.
- Updated `scripts/import-csv.mjs` so legacy data imports into the default local clinic UUID instead of depending on the old single-clinic schema.
- Added `docs/local-database.md` with the local migration and bootstrap workflow.

### Notes

- This machine does not currently have the Supabase CLI or a Docker-compatible container runtime installed, so the local stack was prepared in code but not started here.
- `node --check scripts/import-csv.mjs` passed after the local import changes.
- `tsc --noEmit` still passed after the local database workflow additions.

## 2026-04-12 - Prisma runtime data layer

- Added `prisma/schema.prisma` to model the current public schema used by the SaaS foundation.
- Added a shared Prisma client singleton and table helper layer for:
  - bigint coercion on writes
  - JSON-safe serialization for bigint IDs in API responses
  - generic clinic-scoped CRUD delegates
- Normalized invalid bigint foreign-key input in the generic CRUD layer so malformed numeric payloads now return `400` instead of surfacing as server errors.
- Switched tenant resolution, registration writes, MFA persistence, dashboard counts, and reminder cron queries from Supabase table calls to Prisma.
- Kept Supabase Auth for email/password login and session verification while moving application-table access onto Prisma.

### Notes

- The current migration strategy stays SQL-first in `supabase/migrations/` because the tenancy layer still depends on Postgres-specific features such as RLS and helper functions.
- The next validation step is Prisma schema generation plus a full TypeScript and production build pass with placeholder environment values.

## 2026-04-12 - Prisma validation snapshot

- Added `prisma.config.ts` for Prisma 7 datasource configuration and wired the runtime client through `@prisma/adapter-pg`.
- `npm run prisma:validate` passed with a placeholder local Postgres connection string.
- `npm run prisma:generate` passed and generated the Prisma client into `node_modules/@prisma/client`.
- `tsc --noEmit` passed after the Prisma refactor.
- Targeted ESLint passed for the Prisma-affected runtime files.
- `next build --webpack` passed with placeholder Supabase/auth/database environment values.

### Notes

- The app still depends on Supabase Auth for sign-in and session verification, but application-table reads and writes now go through Prisma.
- Full local runtime testing against an actual Postgres instance still requires the local Supabase stack or another local Postgres database to be running.

## 2026-04-12 - Multi-clinic owner workflow

- Added authenticated account APIs for:
  - listing clinic memberships at `/api/account/clinics`
  - switching the active clinic at `/api/account/active-clinic`
  - creating an additional clinic under the current account via `POST /api/account/clinics`
- Refactored clinic creation into shared tenant helpers so first-clinic registration and later clinic creation now use the same trial and legal-data rules.
- Added `/settings` with a clinic management screen that shows:
  - current clinic status and dates
  - all clinics attached to the current account
  - a form for creating another clinic under the same account
- Added sidebar clinic switching and a navigation entry to clinic settings.

### Notes

- Creating a new clinic now automatically switches the active clinic context to that new clinic.
- Duplicate CUI/CIF clinic creation now returns a conflict response instead of a generic server failure.
- Staff invites and user administration are still not implemented; this chunk only closes the multi-clinic owner flow.

## 2026-04-12 - Team invites and clinic user management

- Added protected clinic-admin APIs for team management:
  - `GET/POST /api/account/team` for team snapshot and sending invites
  - `DELETE /api/account/team/invites/[id]` for invite cancellation
  - `PATCH/DELETE /api/account/team/members/[userId]` for role updates and member removal
- Added public invite endpoints and page:
  - `GET /api/invites/[token]`
  - `POST /api/invites/[token]/accept`
  - `/invite/[token]` for invited staff account creation
- Added SMTP-backed transactional invite email sending through `mail.secforit.ro` using `nodemailer`.
- Extended clinic settings with an admin-only team management section for:
  - inviting assistants, vets, or clinic admins
  - seeing current active users and pending invites
  - changing member roles
  - removing non-owner members
- Enforced the trial user cap in the app layer for invites and invite acceptance.

### Notes

- Invite acceptance currently supports new accounts only. Inviting an email that already has a CanisVET account is rejected for now.
- Removed members keep their auth account, but their clinic membership is deleted and their active clinic is cleared if it pointed to the removed clinic.
- Local env/docs now require `APP_URL` so invite emails can generate absolute acceptance links.

## 2026-04-12 - Billing-state enforcement and blocked-clinic shell

- Updated auth context loading so clinic-scoped business APIs now reject inaccessible clinics after grace expiry with a billing-related access response.
- Exempted the account clinic-management routes from that block so users can still:
  - switch to another clinic
  - create a new clinic
  - reach settings and billing while the current clinic is blocked
- Changed login behavior so users can still sign in even when the current clinic is inaccessible; the session now prefers an accessible clinic when one exists, otherwise it allows access to the restricted shell for recovery actions.
- Added a blocked-clinic app shell that replaces normal content with a recovery screen outside `/billing` and `/settings`.
- Added `/billing` as a placeholder billing hub showing clinic status, trial end, grace end, and reactivation placeholder actions.
- Updated the sidebar so inaccessible clinics only expose recovery-safe navigation and still allow clinic switching.
- Fixed the team invite cap logic so resending an existing pending invite does not consume an extra trial slot.

### Notes

- Payment checkout is still not wired; `/billing` is currently a status and recovery placeholder.
- Business APIs remain blocked for inaccessible clinics, but clinic switching and new-clinic creation stay available so multi-clinic owners are not locked out of the platform.

## 2026-04-12 - Production SaaS plan checkpoint

- Added `docs/saas-plan.md` as the repo-owned execution plan for the CanisVET SaaS transition.
- Marked completed work versus open production gaps so implementation can continue from a stable checkpoint.
- Consolidated the agreed product rules into one place:
  - Romania-only market
  - mandatory clinic legal data
  - mandatory MFA for admins
  - 30-day trial
  - 2-day grace
  - 2-user trial cap
  - EUR billing
  - webhook-first payment synchronization
  - SMTP-based transactional email from `no-reply@secforit.ro`
- Broke remaining work into production-oriented phases covering billing integration, operational hardening, and release validation.

### Notes

- The plan is intentionally stricter than a feature checklist; it includes release gates, operational requirements, and explicit definition-of-done criteria.
- Billing integration remains the next major implementation milestone.

## 2026-04-12 - Billing phase 2 implementation slice

- Added `lib/billing.ts` as a shared billing service layer for:
  - checkout session creation
  - webhook signature verification
  - webhook payload normalization
  - idempotent billing-event persistence
  - clinic-status transitions from billing events
  - trial-expiry reconciliation into `past_due`
- Added protected checkout init API at `POST /api/billing/checkout` (admin-only, inaccessible clinics allowed for recovery).
- Added public webhook ingestion API at `POST /api/billing/webhook` with signed request validation.
- Added cron reconciliation API at `GET /api/cron/billing-reconcile` protected by `CRON_SECRET`.
- Updated proxy public routes to allow billing webhook delivery without user auth.
- Updated `/billing` to:
  - initiate checkout via the new API
  - show persisted billing events for the active clinic
  - remove the old disabled reactivation placeholder button
- Updated `docs/saas-plan.md` statuses so Phase 2 progress is visible from the plan itself.

### Notes

- Checkout initialization now fails fast if billing provider credentials are missing, instead of pretending to process payments.
- Webhook verification is provider-driven in `lib/billing.ts`, so signature strategy can be swapped without changing route contracts.

## 2026-04-12 - Type safety and billing hardening continuation

- Added missing Prisma runtime modeling for email tokens:
  - `EmailTokenType` enum in Prisma schema
  - `EmailToken` model mapped to `public.email_tokens`
- Regenerated Prisma client after schema update and restored `lib/emailToken.ts` delegate typing.
- Fixed auth admin API compatibility with current `@supabase/supabase-js`:
  - switched from non-existent `updateUser` calls to `updateUserById`
  - replaced non-existent `getUserByEmail` usage with a shared paginated lookup helper in `lib/supabaseAdmin.ts`
- Hardened token routes by rejecting tokens not associated to a concrete `user_id`.
- Fixed transactional email token-link interpolation bugs in `lib/email.ts` so verification/reset links now use `args.token` correctly.
- Tightened clinic accessibility logic so `trial` access now depends on `grace_end`, preventing indefinite access if reconcile jobs are delayed.
- Expanded billing audit logging in `lib/billing.ts` for:
  - checkout initialization
  - webhook processing
  - clinic status transitions
  - trial-expiry reconciliation transitions
- Updated SaaS plan status to mark audit logging as `In progress`.

### Notes

- `npx tsc --noEmit` now passes after these fixes.
- Targeted ESLint passes for all touched billing/auth files in this slice.

## 2026-04-12 - Auth abuse-control hardening slice

- Added shared rate-limit utilities in `lib/rateLimit.ts` for request IP extraction and in-memory fixed-window limiting.
- Added explicit `429` abuse controls for:
  - `POST /api/auth/resend-verification` (6 requests per hour per IP)
  - `POST /api/auth/password-reset/request` (8 requests per hour per IP)
- Recorded attempts for both successful and invalid requests to reduce brute-force and enumeration pressure.
- Updated SaaS plan status to mark rate-limit review as `In progress`.

### Notes

- Existing login and registration rate limits were already present; this slice extends the same control pattern to high-abuse email-token endpoints.

## 2026-04-12 - Environment template hardening

- Added `.env.example` with the full current SaaS runtime variable set:
  - auth/session
  - Prisma database
  - SMTP transactional mail
  - billing checkout/webhook
  - cron secrets
  - optional SMS reminders
- Updated `.gitignore` to allow committing `.env.example` while still ignoring real `.env*` secret files.
- Updated `docs/local-database.md` to instruct local setup from `.env.example`.
- Updated SaaS plan statuses to mark environment template/documentation work as `In progress`.

### Notes

- This keeps production-secret handling explicit while avoiding hardcoded credentials in tracked config files.

## 2026-04-12 - Billing provider pivot to Stripe test mode

- Switched development billing flow from generic placeholder provider wiring to native Stripe integration.
- Added `stripe` dependency and implemented:
  - Stripe Checkout session creation in `lib/billing.ts`
  - Stripe webhook signature verification using `stripe-signature`
  - Stripe event normalization and status mapping for clinic lifecycle updates
- Kept idempotent persistence in `billing_events` and billing audit logging for checkout/webhook transitions.
- Updated UI labels to reflect Stripe test-mode checkout.
- Updated local env templates/docs to use:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET`

### Notes

- This is a development provider pivot for faster testing.
- Stripe implementation is built behind a billing service boundary and can be extended if another provider is needed later.

## 2026-04-12 - Stripe billing portal self-service step

- Added Stripe customer portal support in billing service:
  - customer resolution from persisted Stripe webhook payloads
  - portal session creation with optional configuration override
- Added admin-only API endpoint `POST /api/billing/portal`.
- Extended billing action UI with a new "Gestioneaza abonamentul" button.
- Persisted portal-open events into `billing_events` and audit logs for traceability.
- Extended env/docs with `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` (optional).
- Updated SaaS plan wording to explicitly include self-service subscription recovery flows.

### Notes

- Portal access requires at least one webhook-persisted Stripe customer id for the clinic; otherwise the endpoint returns a clear setup error.

## 2026-04-12 - Stripe local testing runbook

- Added `docs/stripe-dev-testing.md` with:
  - local env setup
  - Stripe CLI webhook forwarding
  - end-to-end checkout verification steps
  - portal validation steps
  - troubleshooting guidance
- Added npm helper script:
  - `stripe:webhook:listen` forwarding to `/api/billing/webhook`

### Notes

- This closes the immediate local development testing gap for Stripe.

## 2026-04-12 - Stripe product-id convenience for local testing

- Updated Stripe checkout logic so billing can start with either:
  - `STRIPE_PRICE_ID`, or
  - `STRIPE_PRODUCT_ID` (auto-resolves first active recurring price)
- Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_PRODUCT_ID` to env templates/docs.
- Applied provided local Stripe test credentials and product id in local `.env.local`.

### Notes

- Auto-resolution requires at least one active recurring price under the configured Stripe product.

## 2026-04-12 - Local test company seeded

- Created a local test clinic company in `public.clinics`:
  - `name`: `CanisVET Test Clinic`
  - `legal_name`: `CanisVET Test Clinic SRL`
  - `cui_cif`: `TEST52604126`
  - `status`: `trial`
- Initialized default clinic settings row in `public.clinic_settings` for this clinic:
  - `timezone`: `Europe/Bucharest`
  - `locale`: `ro-RO`
  - `trial_user_limit`: `2`

### Notes

- Seed was inserted in local Supabase Postgres (development only).
- No owner user/admin was attached in this step; this entry is for DB structure and flow testing.

## 2026-04-12 - Local test clinic admin provisioned

- Created a local Supabase Auth user for testing:
  - `email`: `admin.test@canisvet.local`
  - `email_confirm`: `true`
- Linked the user to test clinic `ed143834-edbb-4832-b9f0-1b57ad6f18c0` as owner/admin:
  - updated `public.clinics.owner_user_id`
  - upserted `public.profiles` (`active_clinic_id` set to test clinic)
  - upserted `public.user_clinics` with `role = clinic_admin`, `is_owner = true`

### Notes

- This is local development seed data for end-to-end auth/tenant testing.

## 2026-04-12 - Consolidated checkpoint (all work up to now)

- Stabilized local development runtime:
  - installed/started local stack dependencies and brought up Supabase local services
  - fixed SQL migration issue in `20260413_email_tokens.sql` (`create type if not exists` compatibility)
  - confirmed local DB services and ports are reachable for app development
- Resolved registration runtime blockers:
  - fixed environment mismatch between local Prisma DB and Supabase auth endpoints
  - fixed foreign-key registration failure (`clinics_owner_user_id_fk`) by aligning local auth + DB setup
- Hardened registration behavior for SMTP outages:
  - registration no longer fails hard if verification email sending fails
  - verification-send failure is logged, while clinic/user creation still succeeds
- Validated Stripe development flow:
  - webhook ingest route responds correctly to Stripe CLI forwarded events
  - checkout flow supports either direct price id or auto-resolved recurring price from product id
  - billing portal endpoint added for admin self-service in test mode
- Completed local test data bootstrap:
  - test clinic created and configured
  - test clinic owner/admin account provisioned and linked across `auth.users`, `profiles`, `user_clinics`, and `clinics.owner_user_id`
- Documentation state is current:
  - SaaS execution plan maintained in `docs/saas-plan.md`
  - local DB and Stripe testing runbooks updated
  - implementation log updated continuously per completed slice

### Notes

- Sensitive credentials are expected only in local `.env.local` and must not be committed.
- Stripe is currently the active billing provider direction in both development and production planning.

## 2026-04-12 - Billing provider decision update

- Confirmed product decision: Stripe remains the payment provider for production as well.
- Updated planning docs to remove EU-Platesc/BTRL as the target production provider.
- Kept current Stripe implementation track as the main production path.

## 2026-04-12 - UI layout refresh (professional visual pass)

- Applied a cohesive visual refresh focused on the authenticated app shell:
  - upgraded global background and surface styling in `app/globals.css`
  - improved shell composition with decorative gradients and elevated content container in `components/AppShell.tsx`
  - redesigned sidebar branding, navigation states, and mobile overlay in `components/Sidebar.tsx`
  - refreshed dashboard hero and module cards in `app/(app)/page.tsx`
  - improved section/table presentation in `components/SectionPage.tsx` and `components/DataTable.tsx`
- Kept functionality unchanged; this slice is strictly a presentational and UX polish pass.
- Avoided external runtime font fetching to keep build stability in restricted environments.

### Validation

- `npx next build --webpack` passed.
- `npx tsc --noEmit` passed.

## 2026-04-12 - Navigation moved from sidebar to header

- Replaced left sidebar navigation with a top header navigation so content pages use full width.
- Refactored shell structure in `components/AppShell.tsx`:
  - removed sidebar-based horizontal split
  - kept a single full-width content surface under the header
- Rebuilt navigation component in `components/Sidebar.tsx` as a responsive header menu:
  - desktop horizontal nav links
  - mobile expandable menu
  - clinic switcher, account role display, and logout actions preserved
  - clinic-access filtering preserved for blocked-clinic scenarios

### Validation

- `npx next build --webpack` passed.
- `npx tsc --noEmit` passed.

## 2026-04-12 - Premium header refinement

- Upgraded header visual language for a more premium look:
  - dual-layer header with dark gradient brand bar + white navigation surface
  - operational status chips (access state + clinic billing state)
  - refined nav pills, spacing, and contrast
- Kept all existing behavior:
  - clinic switcher
  - role visibility
  - responsive mobile menu
  - logout actions
  - tenant accessibility filtering for menu entries

### Validation

- `npx next build --webpack` passed.
- `npx tsc --noEmit` passed.

## 2026-04-13 - Global search from header

- Added authenticated clinic-scoped global search API at `GET /api/search`:
  - uses current clinic context from auth cookies
  - searches across `clients`, `pets`, `appointments`, `records`, `prescriptions`, `vets`, `reminders`, `sales`
  - returns grouped result cards with section label, title, subtitle, and navigation target
- Added premium header global-search component:
  - new `components/GlobalSearch.tsx`
  - debounced query (`240ms`)
  - result dropdown with empty/error states and loading indicator
  - direct navigation to module pages with prefilled `?search=...`
- Wired module table filtering to URL search param:
  - `components/SectionPage.tsx` now reads `search` from URL
  - `components/DataTable.tsx` accepts `initialSearch` and syncs it to table filtering
- Integrated global search into desktop header in `components/Sidebar.tsx`.

### Validation

- `npx next build --webpack` passed.
- `npx tsc --noEmit` passed.

## 2026-04-13 - Data import strategy plan (external systems -> CanisVET)

- Added `docs/data-import-plan.md` with a production-oriented plan for importing historical data from external systems.
- Plan includes:
  - ingestion -> staging -> mapping -> validated load architecture
  - AI-assisted field mapping with confidence thresholds and manual review gates
  - explicit handling of additional/non-standard source fields via JSONB preservation
  - proposed import tables (`import_jobs`, `import_job_rows`, `import_mapping_templates`, suggestions/conflicts)
  - API workflow, dry-run/execute model, dedupe and validation strategy
  - rollout phases and production definition-of-done

### Notes

- AI is defined as a mapping assistant only, not authoritative execution logic.
- The plan ensures unknown source fields are not lost during import.

## 2026-04-13 - Data import Phase 1 backend implementation

- Added import persistence schema and RLS policies:
  - `supabase/migrations/20260413_import_pipeline.sql`
  - tables: `import_jobs`, `import_job_rows`, `import_mapping_templates`, `import_mapping_suggestions`, `import_conflicts`
- Extended Prisma schema with import models and regenerated client.
- Added import service helpers in `lib/imports.ts`:
  - CSV parsing
  - deterministic field-mapping suggestions
  - safe mapping resolution
  - row transformation and validation
  - import audit logging helper
- Implemented import API routes:
  - `GET/POST /api/import/jobs`
  - `GET /api/import/jobs/[id]`
  - `POST /api/import/jobs/[id]/analyze`
  - `POST /api/import/jobs/[id]/dry-run`
  - `POST /api/import/jobs/[id]/execute`
- Enforced clinic-admin access and clinic scoping for all import endpoints.
- Preserved additional/unmapped source fields in staging (`import_job_rows.normalized_payload.extra_fields`) so no input data is dropped during Phase 1.

### Validation

- `DATABASE_URL=... npm run prisma:generate` passed.
- `npx tsc --noEmit` passed.
- `npx next build --webpack` passed.
- Migration applied successfully on local database.

## 2026-04-13 - Data import Phase 1 UI implementation

- Added a dedicated import page at `/imports`:
  - `app/(app)/imports/page.tsx`
  - `components/ImportJobsPage.tsx`
- Added import navigation entry in premium header:
  - `components/Sidebar.tsx` (`Import date`)
- Implemented end-to-end admin workflow UI:
  - create import job from CSV text or JSON array payload
  - list and select recent import jobs
  - run `analyze`, `dry-run`, and `execute` actions
  - display job counters and recent row-level errors
  - show analyze preview (suggestion count + unmapped fields)

### Validation

- `npx next build --webpack` passed.
- `npx tsc --noEmit` passed.

## 2026-04-13 - Local database reset to clean baseline

- Per request, reset local Supabase database to start fresh.
- Fixed migration version conflict before reset:
  - renamed `supabase/migrations/20260413_import_pipeline.sql`
  - to `supabase/migrations/2026041302_import_pipeline.sql`
- Re-ran full reset with migrations + seed:
  - `npm run db:reset`
- Verified clean baseline after reset:
  - all business tables (`clients`, `pets`, `vets`, `appointments`, `records`, `prescriptions`, `reminders`, `sales`) are `0`
  - import pipeline tables start empty (`import_jobs = 0`)
  - `billing_events = 0`

## 2026-04-13 - Environment normalization for end-to-end local testing

- Normalized `.env.local` for complete local flow coverage:
  - registration/auth (`AUTH_SECRET`, Supabase URL/keys)
  - Prisma DB (`DATABASE_URL`)
  - Stripe checkout/webhook (`STRIPE_*`, publishable key)
  - SMTP transactional email (`SMTP_*`, `MAIL_FROM_*`)
  - cron/reminders (`CRON_SECRET`, `SMSO_*`)
- Removed obsolete local vars (`AUTH_USERNAME`, `AUTH_PASSWORD`, `ALLOWED_IPS`) from `.env.local`.
- Confirmed required runtime env keys are present for local E2E registration + import path.

## 2026-04-13 - Generated login design implementation

- Implemented `generated_pages/login_page_generated` design into production login route.
- Added dedicated login experience component:
  - `components/auth/LoginExperience.tsx`
- Updated route file to use the new component:
  - `app/login/page.tsx`
- Brought in required visual asset:
  - `public/images/hero-vet.jpg`
- Aligned route behavior with existing app flows:
  - preserved auth API contract (`/api/auth/login`, 2FA redirect handling)
  - corrected forgot-password link to existing route (`/reset-password/request`)

## 2026-04-14 - Login hero image visibility fix

- Root cause: auth proxy was intercepting static public assets (`/images/*`) and forcing auth flow, which blocked the login-side hero image.
- Updated `proxy.ts` public bypass logic:
  - allow `/images/` path directly
  - allow any static file request with extension (`/path/file.ext`)
- Kept login UI component unchanged functionally; image path remains `/images/hero-vet.jpg`.

## 2026-04-14 - Unified app logo update

- Renamed generated asset `public/images/image-01.svg` to canonical app logo `public/logo.svg`.
- Updated app branding references to use the same logo asset:
  - `components/Header.tsx`
  - `components/Footer.tsx`
  - `components/Sidebar.tsx`
  - `components/auth/LoginExperience.tsx`

## 2026-04-14 - Logo presentation cleanup (transparent + no name label)

- Increased hero logo size on login page for better visibility.
- Removed hero logo background so logo renders on transparent background.
- Removed visible `CanisVET`/`CanisVet` text labels from the frontend app shell and auth pages.
- Updated affected files:
  - `components/auth/LoginExperience.tsx`
  - `components/Header.tsx`
  - `components/Footer.tsx`
  - `components/Sidebar.tsx`
  - `app/register/page.tsx`
  - `components/AcceptInvitePage.tsx`
  - `app/reset-password/[token]/page.tsx`
  - `app/(app)/page.tsx`
  - `app/layout.tsx`
  - `app/login/2fa/setup/page.tsx`
  - `app/legal/privacy/page.tsx`
  - `app/legal/terms/page.tsx`
  - `app/legal/dpa/page.tsx`

## 2026-04-14 - Login hero/content split refinement

- Removed all branding text/logo content from hero panel on login page.
- Kept hero as image-only visual background with subtle overlay.
- Moved a larger logo to the authentication panel, positioned above login heading/form.
- Updated file:
  - `components/auth/LoginExperience.tsx`

## 2026-04-14 - SVG logo transparency fix

- Edited `public/logo.svg` and removed the white full-canvas background path.
- Result: logo now renders with transparent background.

## 2026-04-14 - Login logo size/placement adjustment

- Increased login-panel logo size to `h-48 w-48` (2x).
- Moved logo below the registration text/link block on login page.
- Updated file:
  - `components/auth/LoginExperience.tsx`
