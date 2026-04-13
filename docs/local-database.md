# Local Database Workflow

This project is now set up to use a local-first Supabase database workflow during development, with Prisma as the application data layer.

## Prerequisites

- Install the Supabase CLI.
- Install a container runtime compatible with Docker APIs.
- Keep migrations in `supabase/migrations/`.
- Keep the Prisma schema in `prisma/schema.prisma`.

## Local Development Flow

1. Start the local Supabase stack:

   ```bash
   npm run db:start
   ```

2. Reset the local database and apply all migrations:

   ```bash
   npm run db:reset
   ```

3. Check the local service URLs and API keys:

   ```bash
   npm run db:status
   ```

4. Put the local values into `.env.local`:

   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy from supabase status>
   SUPABASE_SERVICE_ROLE_KEY=<copy from supabase status>
   AUTH_SECRET=<set a long random secret>
   APP_URL=http://localhost:3000
   SMTP_HOST=mail.secforit.ro
   SMTP_PORT=<your smtp port>
   SMTP_USER=<your smtp user>
   SMTP_PASS=<your smtp password>
   SMTP_SECURE=<true_or_false>
   MAIL_FROM_ADDRESS=no-reply@secforit.ro
   MAIL_FROM_NAME=CanisVET
   STRIPE_SECRET_KEY=<stripe_test_secret_key>
   STRIPE_PRICE_ID=<stripe_price_id_for_subscription_optional_if_product_is_set>
   STRIPE_PRODUCT_ID=<stripe_product_id_optional_if_price_is_set>
   STRIPE_WEBHOOK_SECRET=<stripe_webhook_signing_secret>
   STRIPE_BILLING_PORTAL_CONFIGURATION_ID=<optional_stripe_portal_config_id>
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe_test_publishable_key>
   CRON_SECRET=<long_random_secret_for_cron_endpoints>
   ```

   Tip: start from `.env.example` and replace placeholder values.

5. Generate the Prisma client against the local schema:

   ```bash
   npm run prisma:generate
   ```

6. Bootstrap legacy data into the default local clinic:

   ```bash
   npm run import-csv
   ```

## Notes

- The import script defaults to clinic ID `00000000-0000-0000-0000-000000000001`.
- Override that by setting `DEFAULT_CLINIC_ID` in `.env.local` before running `npm run import-csv`.
- The local Supabase config lives in `supabase/config.toml`.
- Until production deployment, schema changes should be tested locally first and committed as SQL migration files.
- Prisma is the runtime access layer; the SQL in `supabase/migrations/` remains the source of truth for Postgres-specific features such as RLS, triggers, and auth-linked tables.

## Production Later

When you are ready to deploy:

1. Authenticate the CLI.
2. Link the local repo to the production Supabase project.
3. Push the migrations.

Typical commands:

```bash
supabase login
supabase link --project-ref <project-id>
npm run db:push
```
