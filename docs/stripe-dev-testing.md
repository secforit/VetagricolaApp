# Stripe Dev Testing

This runbook is for local Stripe test-mode validation of CanisVET billing.

## Prerequisites

- Stripe account with test mode enabled
- A recurring Stripe Price ID for the clinic plan
- Stripe CLI installed locally
- App running on `http://localhost:3000`

## Environment variables

Add these to `.env.local`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_PRODUCT_ID=prod_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BILLING_PORTAL_CONFIGURATION_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Notes:

- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` is optional.
- Leave it empty to use Stripe default portal configuration.
- You can set either `STRIPE_PRICE_ID` directly, or `STRIPE_PRODUCT_ID` and the app will auto-pick the first active recurring price.

## Local webhook forwarding

In one terminal:

```bash
npm run stripe:webhook:listen
```

Copy the shown webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## Start app

In another terminal:

```bash
npm run dev
```

## Test flow

1. Login as a clinic admin.
2. Open `/billing`.
3. Click `Reactivare prin Stripe (test)`.
4. Complete Stripe Checkout with test card `4242 4242 4242 4242`.
5. Verify webhook delivery in Stripe CLI output.
6. Refresh `/billing` and confirm:
   - new events in billing history
   - clinic status moves according to payment result
7. Click `Gestioneaza abonamentul` to verify billing portal opens.

## Useful Stripe CLI commands

Trigger payment success event:

```bash
stripe trigger invoice.payment_succeeded
```

Trigger payment failure event:

```bash
stripe trigger invoice.payment_failed
```

## Troubleshooting

- `STRIPE_SECRET_KEY is missing`:
  - check `.env.local` and restart dev server.
- `STRIPE_WEBHOOK_SECRET is missing`:
  - start Stripe CLI listen and copy the generated `whsec_...`.
- `clinic_id is missing from Stripe event metadata`:
  - ensure checkout sessions are created from `/api/billing/checkout`.
- `Nu exista inca un customer Stripe asociat clinicii` in portal route:
  - finalize at least one checkout so webhook events persist Stripe customer data.
