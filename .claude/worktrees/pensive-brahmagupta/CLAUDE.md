# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cabinet Veterinar Arad** — a veterinary clinic management system built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Supabase as the database backend.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # Run ESLint
npm run import-csv  # Import CSV data into Supabase (see CSVs/ directory)
node scripts/setup-auth.mjs <password>  # Generate bcrypt hash + TOTP secret for .env.local
node scripts/create-user.mjs            # Create a user
```

## Required Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_USERNAME=
AUTH_PASSWORD=
AUTH_SECRET=
```

## Architecture

### Route Structure
- `app/login/` — login page and 2FA pages (`/2fa`, `/2fa/setup`)
- `app/(app)/` — all protected pages (dashboard, clients, pets, appointments, records, prescriptions, sales, reminders, vets), wrapped in a layout with `Sidebar`
- `app/api/` — REST API routes per entity, each with collection (`/api/[entity]`) and item (`/api/[entity]/[id]`) handlers
- `app/api/auth/` — login, logout, TOTP setup, TOTP verify

### Auth Flow
Authentication is custom (no NextAuth). Login posts to `/api/auth/login` which validates credentials from env vars and issues a short-lived JWT (`auth_token` cookie). If TOTP is configured, a `auth_pending` cookie is issued instead and the user is redirected to `/login/2fa`. The TOTP secret is stored in the `totp_secrets` Supabase table. There is **no `middleware.ts`** — route protection is handled in each API route individually.

### API Pattern (`lib/apiHelpers.ts`)
All CRUD API routes use factory functions from `lib/apiHelpers.ts`:
- `listRoute(table)` — GET with search (OR ilike across configured columns), pagination
- `createRoute(table)`, `updateRoute(table)`, `deleteRoute(table)`, `getOneRoute(table)`

Each `app/api/[entity]/route.ts` simply calls these factories with the Supabase table name.

### Frontend Pattern
Each section page (clients, pets, etc.) uses `SectionPage` component with `title`, `apiPath`, and `columns` (typed as `Column[]` from `lib/types.ts`). `SectionPage` fetches all data client-side and passes it to `DataTable`, which handles client-side search/sort/pagination and opens an `EditModal` for create/edit.

### Key Files
- `lib/db.ts` — singleton Supabase client (server-side only, uses `SUPABASE_SERVICE_ROLE_KEY`)
- `lib/types.ts` — all entity interfaces + `Column` type used for table/form config
- `lib/apiHelpers.ts` — CRUD factory functions
- `lib/serviceLabels.ts`, `lib/petLabels.ts` — label mappings for select dropdowns
- `components/SectionPage.tsx` — generic page wrapper for all data sections
- `components/DataTable.tsx` — table with search, sort, pagination, edit/delete
- `components/EditModal.tsx` — modal form for create/edit, driven by `Column[]` config

### Data Import
`CSVs/` contains exported data from the old system. `scripts/import-csv.mjs` reads these CSVs and upserts into Supabase. Reads `.env.local` directly (not via Next.js).

### Path Aliases
`@/*` maps to the project root (e.g., `@/lib/types`, `@/components/DataTable`).
