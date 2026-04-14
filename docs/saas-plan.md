# CanisVET SaaS Plan

Last updated: 2026-04-12

This document is the implementation plan for turning the current CanisVET codebase into a production-ready SaaS for veterinary clinics in Romania. It reflects the decisions already made, marks completed work, and defines the remaining execution order.

## Product decisions

- Market: Romania only
- Product model: SaaS for veterinary clinics
- Tenant model: one clinic per active app session, with account owners allowed to create multiple clinics
- User model: a user does not belong to multiple clinics today, except through clinics they create as owner
- Roles: `clinic_admin`, `vet`, `assistant`
- Registration: clinic registration with legal and billing information
- Trial: 30 days
- Grace period: 2 days
- Trial seat cap: 2 active or pending users
- Record limits: none
- Currency: EUR
- MFA: mandatory for clinic admins
- Email delivery: platform-sent transactional emails over SMTP `mail.secforit.ro`
- Mail sender address: `no-reply@secforit.ro`
- Mail sender name: `CanisVET`
- Payment provider (development): Stripe test mode
- Payment provider (production): Stripe
- Payment status sync strategy: webhook-first, not polling

## Status legend

- `Done`: implemented and recorded in the repo
- `In progress`: foundation exists but the feature is not production-complete
- `Pending`: not implemented yet
- `Deferred`: intentionally left for a later phase

## Current status

### Phase 1: SaaS foundation

- `Done` Multi-tenant database structure with `clinics`, `profiles`, `user_clinics`, `clinic_settings`, `clinic_invites`, `billing_events`, `audit_logs`, `auth_mfa_factors`, `auth_log`
- `Done` Prisma runtime data layer on top of the SaaS schema
- `Done` Local-first migration workflow with Supabase and Prisma
- `Done` Clinic self-registration with Romanian legal fields
- `Done` Trial and grace-period initialization on clinic creation
- `Done` Supabase Auth login with cookie-based app sessions
- `Done` Mandatory admin MFA with TOTP setup and verification
- `Done` Clinic-scoped CRUD and dashboard access
- `Done` Blocked-clinic shell when trial or grace access expires
- `Done` Multi-clinic owner flow with active-clinic switching
- `Done` Team invite flow for new users
- `Done` Transactional invite, verification, and password-reset email plumbing
- `Done` Billing access enforcement based on clinic state
- `In progress` End-to-end validation against a real local database runtime
- `In progress` Production billing and subscription lifecycle

### Operational gaps still open

- `In progress` Payment checkout/webhook flow with Stripe
- `In progress` Payment webhook endpoint with signature validation and idempotency
- `In progress` Billing lifecycle automation from payment events into clinic status updates
- `In progress` Billing UI and subscription self-service flows
- `Pending` Staging rehearsal of the full migration set against a real database
- `Pending` Full lint cleanup or lint scope isolation so CI can enforce quality without generated-file noise
- `In progress` Production environment templates and secret inventory
- `Pending` Background jobs or scheduled reconciliation for payment edge cases
- `Pending` Audit coverage review for security-sensitive flows

## Production-ready implementation plan

### Phase 2: Billing and subscription lifecycle

Goal: make clinic access state come from real subscription events, not placeholders.

- `Done` Add a billing service layer for payment session creation, webhook verification, event normalization, and clinic status transitions
- `Done` Implement a checkout start endpoint for clinic admins from the billing page
- `Done` Persist provider callbacks into `billing_events` before applying business logic
- `Done` Add idempotent webhook persistence based on provider and external ID
- `In progress` Update clinic state transitions so they are deterministic:
  - `trial` -> `active` after successful first payment
  - `trial` -> `past_due` when trial expires without valid payment
  - `active` -> `past_due` when renewal payment fails or expires
  - `past_due` -> `active` after recovery payment
  - `past_due` -> `canceled` only when the business rule explicitly requires it
- `Done` Keep the 2-day grace rule enforced from billing state and reconciliation jobs
- `In progress` Replace the billing placeholder screen with checkout, payment status, event history, and self-service recovery actions
- `Done` Add a minimal reconciliation job for missed webhooks or provider downtime

Production requirements:

- Accept webhook events only after signature or source verification
- Store raw payloads for audit and support investigation
- Make webhook handlers safe to retry
- Never change clinic status before storing the inbound event

### Phase 3: Validation, security, and operations

Goal: make the system safe to operate in production.

- `Pending` Add request validation for all public and billing endpoints
- `In progress` Review rate limits for registration, login, verification resend, password reset, and invite acceptance
- `In progress` Expand audit logging for:
  - registration
  - clinic creation
  - invite send and accept
  - role changes
  - user removal
  - MFA setup and verification
  - billing state changes
- `In progress` Add environment documentation for:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `AUTH_SECRET`
  - `APP_URL`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_SECURE`
  - `MAIL_FROM_ADDRESS`
  - `MAIL_FROM_NAME`
  - billing provider keys and webhook secrets
- `Pending` Define backup, restore, and rollback procedures for schema changes
- `Pending` Set up a staging environment that mirrors production auth, database, SMTP, and billing callbacks
- `Pending` Ensure generated output like `.next` and local worktrees do not pollute lint or CI

Production requirements:

- CI must run TypeScript validation and production build successfully
- Database migrations must be replayable from zero on a clean local instance
- Production secrets must not be hardcoded in tracked files

### Phase 4: Release hardening

Goal: move from feature-complete to deployable.

- `Pending` Run the full migration set on a real local database instance
- `Pending` Run CSV import against the tenant-aware schema and verify data lands in the default clinic
- `Pending` Test the full auth lifecycle:
  - register
  - verify email
  - login
  - MFA setup
  - MFA challenge
  - password reset
- `Pending` Test clinic lifecycle scenarios:
  - first clinic registration
  - second clinic creation by the same owner
  - team invite
  - invite acceptance
  - role change
  - member removal
  - blocked clinic recovery path
- `Pending` Test billing lifecycle scenarios:
  - successful first payment
  - renewal success
  - renewal failure
  - grace expiration
  - recovery payment
  - duplicate webhook delivery
  - missing webhook recovered by reconciliation
- `Pending` Freeze schema changes for release and review the rollback path
- `Pending` Prepare deployment runbook and cutover checklist

## What is already good enough to build on

- The tenant model is already embedded in the schema and request auth path
- The legal registration shape already matches the Romania-only scope
- Admin MFA is already enforced in the login flow
- Local database workflow exists and is compatible with Prisma
- Team management and trial seat enforcement are already present
- Transactional email building blocks already exist and are aligned with the chosen SMTP provider

## What is not yet production-ready

- Billing is not connected to a real payment provider yet
- The `/billing` experience is still a placeholder
- Local runtime validation has not been completed on this machine because the local Supabase stack has not been started here
- The current general lint command is not yet a reliable production gate
- A staged rehearsal of migrations and billing flows has not been completed

## Definition of done for production

CanisVET is production-ready only when all of the following are true:

- Clinic registration, verification, login, MFA, and password reset work against a real database
- Clinic data is isolated by tenant at the database and request layers
- Payment checkout and webhook processing can activate and recover clinics without manual SQL changes
- Trial expiry and grace expiry are enforced correctly
- Billing failures block operational routes but preserve recovery access
- Transactional emails are delivered from the configured SMTP provider
- Migrations run cleanly on a fresh database and on an upgrade path
- CI-level validation is stable enough to block bad releases
- Secrets are injected through environment variables and are not committed
- A deployment and rollback procedure exists

## Deferred items

- Support for inviting existing CanisVET accounts into another clinic
- Non-Romanian legal and billing flows
- Additional billing providers
- Trial extensions
- Record or storage quotas
