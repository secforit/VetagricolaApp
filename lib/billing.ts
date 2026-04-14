import Stripe from 'stripe';
import { ClinicStatus, Prisma } from '@prisma/client';
import { GRACE_DAYS } from './clinicSetup';
import prisma from './prisma';

const BILLING_PROVIDER = 'stripe';
const DEFAULT_CURRENCY = 'EUR';

const SUCCESS_STATUSES = new Set(['paid', 'succeeded', 'active', 'trialing']);
const FAILURE_STATUSES = new Set(['failed', 'past_due', 'unpaid']);
const CANCELED_STATUSES = new Set(['canceled', 'incomplete_expired']);

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is missing.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  return stripeClient;
}

function getAppUrl() {
  return (process.env.APP_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
}

function addGraceDays(baseDate: Date): Date {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + GRACE_DAYS);
  return next;
}

function isDuplicateError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function writeBillingAudit(args: {
  clinicId: string;
  actorUserId?: string | null;
  action: string;
  recordId?: string | null;
  payload?: Prisma.JsonObject;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        clinic_id: args.clinicId,
        actor_user_id: args.actorUserId ?? null,
        table_name: 'billing_events',
        action: args.action,
        record_id: args.recordId ?? null,
        payload: args.payload ?? {},
      },
    });
  } catch {
    // Billing flow should not fail because audit logging failed.
  }
}

function parseAmountCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  return null;
}

function parseCurrency(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().toUpperCase();
  }

  return DEFAULT_CURRENCY;
}

function normalizeClinicStatus(status: string) {
  return status.trim().toLowerCase();
}

async function transitionClinicStatus(clinicId: string, normalizedStatus: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!clinic) {
    throw new Error('Clinica nu a fost gasita.');
  }

  const now = new Date();

  if (SUCCESS_STATUSES.has(normalizedStatus)) {
    if (clinic.status !== 'active') {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          status: 'active',
          grace_end: addGraceDays(now),
        },
      });

      await writeBillingAudit({
        clinicId,
        action: 'clinic_status_transition',
        payload: {
          previous_status: clinic.status,
          next_status: 'active',
          source_status: normalizedStatus,
        },
      });
    }
    return;
  }

  if (FAILURE_STATUSES.has(normalizedStatus)) {
    if (clinic.status === 'active' || clinic.status === 'past_due' || clinic.status === 'trial') {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          status: 'past_due',
          grace_end: addGraceDays(now),
        },
      });

      await writeBillingAudit({
        clinicId,
        action: 'clinic_status_transition',
        payload: {
          previous_status: clinic.status,
          next_status: 'past_due',
          source_status: normalizedStatus,
        },
      });
    }
    return;
  }

  if (CANCELED_STATUSES.has(normalizedStatus)) {
    if (clinic.status !== 'canceled') {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          status: 'canceled',
        },
      });

      await writeBillingAudit({
        clinicId,
        action: 'clinic_status_transition',
        payload: {
          previous_status: clinic.status,
          next_status: 'canceled',
          source_status: normalizedStatus,
        },
      });
    }
  }
}

export interface BillingCheckoutSession {
  checkoutUrl: string;
  provider: string;
  externalId: string;
  amountCents: number;
  currency: string;
}

export interface BillingPortalSession {
  portalUrl: string;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractStripeCustomerIdFromPayload(payload: Prisma.JsonValue | null): string | null {
  const root = readRecord(payload);
  const data = readRecord(root?.data);
  const object = readRecord(data?.object);
  const customer = object?.customer;

  if (typeof customer === 'string' && customer.trim()) {
    return customer.trim();
  }

  const customerObject = readRecord(customer);
  if (typeof customerObject?.id === 'string' && customerObject.id.trim()) {
    return customerObject.id.trim();
  }

  return null;
}

async function findClinicStripeCustomerId(clinicId: string): Promise<string | null> {
  const recentEvents = await prisma.billingEvent.findMany({
    where: {
      clinic_id: clinicId,
      provider: BILLING_PROVIDER,
    },
    select: {
      payload: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 30,
  });

  for (const event of recentEvents) {
    const customerId = extractStripeCustomerIdFromPayload(event.payload);
    if (customerId) {
      return customerId;
    }
  }

  return null;
}

export async function createBillingCheckoutSession(args: {
  clinicId: string;
  userId: string;
}): Promise<BillingCheckoutSession> {
  const stripe = getStripeClient();
  const configuredPriceId = process.env.STRIPE_PRICE_ID?.trim();
  let priceId = configuredPriceId || '';

  if (!priceId) {
    const productId = process.env.STRIPE_PRODUCT_ID?.trim();
    if (!productId) {
      throw new Error('STRIPE_PRICE_ID or STRIPE_PRODUCT_ID is required.');
    }

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: 'recurring',
      limit: 10,
    });

    const firstRecurring = prices.data.find(
      (price) => Boolean(price.recurring) && price.type === 'recurring'
    );

    if (!firstRecurring) {
      throw new Error('No active recurring Stripe price found for STRIPE_PRODUCT_ID.');
    }

    priceId = firstRecurring.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${getAppUrl()}/billing?checkout=success`,
    cancel_url: `${getAppUrl()}/billing?checkout=cancel`,
    client_reference_id: args.clinicId,
    metadata: {
      clinic_id: args.clinicId,
      user_id: args.userId,
    },
    subscription_data: {
      metadata: {
        clinic_id: args.clinicId,
      },
    },
    allow_promotion_codes: true,
  });

  const amountCents = parseAmountCents(session.amount_total) ?? 0;
  const currency = parseCurrency(session.currency);

  await prisma.billingEvent.create({
    data: {
      clinic_id: args.clinicId,
      provider: BILLING_PROVIDER,
      external_id: session.id,
      status: 'checkout_started',
      amount_cents: amountCents,
      currency,
      payload: {
        source: 'stripe_checkout',
        checkout_url: session.url,
        created_by_user_id: args.userId,
      },
    },
  });

  await writeBillingAudit({
    clinicId: args.clinicId,
    actorUserId: args.userId,
    action: 'checkout_started',
    recordId: session.id,
    payload: {
      provider: BILLING_PROVIDER,
      amount_cents: amountCents,
      currency,
    },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  return {
    checkoutUrl: session.url,
    provider: BILLING_PROVIDER,
    externalId: session.id,
    amountCents,
    currency,
  };
}

export async function createBillingPortalSession(args: {
  clinicId: string;
  userId: string;
}): Promise<BillingPortalSession> {
  const customerId = await findClinicStripeCustomerId(args.clinicId);
  if (!customerId) {
    throw new Error(
      'Nu exista inca un customer Stripe asociat clinicii. Finalizeaza mai intai un checkout.'
    );
  }

  const stripe = getStripeClient();
  const portalConfigurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/billing`,
    configuration: portalConfigurationId || undefined,
  });

  await prisma.billingEvent.create({
    data: {
      clinic_id: args.clinicId,
      provider: BILLING_PROVIDER,
      external_id: portal.id,
      status: 'portal_opened',
      currency: DEFAULT_CURRENCY,
      payload: {
        source: 'stripe_portal',
        customer_id: customerId,
        created_by_user_id: args.userId,
        portal_url: portal.url,
      },
    },
  });

  await writeBillingAudit({
    clinicId: args.clinicId,
    actorUserId: args.userId,
    action: 'portal_opened',
    recordId: portal.id,
    payload: {
      provider: BILLING_PROVIDER,
      customer_id: customerId,
    },
  });

  return {
    portalUrl: portal.url,
  };
}

async function resolveClinicIdFromEvent(event: Stripe.Event): Promise<string | null> {
  const object = event.data.object;
  const metadata = 'metadata' in object ? object.metadata : null;

  if (metadata?.clinic_id) {
    return metadata.clinic_id;
  }

  if (
    event.type === 'checkout.session.completed' &&
    'client_reference_id' in object &&
    typeof object.client_reference_id === 'string' &&
    object.client_reference_id.trim()
  ) {
    return object.client_reference_id;
  }

  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof subscriptionRef === 'string'
        ? subscriptionRef
        : subscriptionRef?.id ?? null;

    if (!subscriptionId) {
      return null;
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.metadata?.clinic_id ?? null;
  }

  return null;
}

function normalizeStripeEventStatus(event: Stripe.Event): string {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.payment_status === 'paid' ? 'paid' : 'pending';
    }
    case 'invoice.payment_succeeded':
      return 'paid';
    case 'invoice.payment_failed':
      return 'failed';
    case 'customer.subscription.deleted':
      return 'canceled';
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      return normalizeClinicStatus(subscription.status);
    }
    default:
      return normalizeClinicStatus(event.type);
  }
}

function extractAmountCentsFromStripeEvent(event: Stripe.Event): number | null {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return parseAmountCents(session.amount_total);
    }
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      return parseAmountCents(invoice.amount_paid || invoice.amount_due);
    }
    default:
      return null;
  }
}

function extractCurrencyFromStripeEvent(event: Stripe.Event): string {
  const object = event.data.object as { currency?: string | null };
  return parseCurrency(object.currency);
}

async function persistWebhookEvent(args: {
  clinicId: string;
  externalId: string;
  status: string;
  amountCents: number | null;
  currency: string;
  payload: Prisma.JsonObject;
}) {
  const existing = await prisma.billingEvent.findFirst({
    where: {
      provider: BILLING_PROVIDER,
      external_id: args.externalId,
    },
  });

  if (existing) {
    const isDuplicate =
      existing.status === args.status &&
      existing.amount_cents === args.amountCents &&
      existing.currency === args.currency;

    if (isDuplicate) {
      return { event: existing, duplicate: true };
    }

    const updated = await prisma.billingEvent.update({
      where: { id: existing.id },
      data: {
        clinic_id: args.clinicId,
        status: args.status,
        amount_cents: args.amountCents,
        currency: args.currency,
        payload: args.payload,
      },
    });

    return { event: updated, duplicate: false };
  }

  try {
    const created = await prisma.billingEvent.create({
      data: {
        clinic_id: args.clinicId,
        provider: BILLING_PROVIDER,
        external_id: args.externalId,
        status: args.status,
        amount_cents: args.amountCents,
        currency: args.currency,
        payload: args.payload,
      },
    });

    return { event: created, duplicate: false };
  } catch (error) {
    if (!isDuplicateError(error)) {
      throw error;
    }

    const already = await prisma.billingEvent.findFirst({
      where: {
        provider: BILLING_PROVIDER,
        external_id: args.externalId,
      },
    });

    if (!already) {
      throw error;
    }

    return { event: already, duplicate: true };
  }
}

export function constructVerifiedStripeEvent(rawBody: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is missing.');
  }
  if (!signature) {
    throw new Error('Stripe signature header is missing.');
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function processBillingWebhookEvent(event: Stripe.Event) {
  const clinicId = await resolveClinicIdFromEvent(event);
  if (!clinicId) {
    throw new Error('clinic_id is missing from Stripe event metadata.');
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true },
  });
  if (!clinic) {
    throw new Error('Clinica din webhook nu exista.');
  }

  const status = normalizeStripeEventStatus(event);
  const amountCents = extractAmountCentsFromStripeEvent(event);
  const currency = extractCurrencyFromStripeEvent(event);

  const persisted = await persistWebhookEvent({
    clinicId,
    externalId: event.id,
    status,
    amountCents,
    currency,
    payload: event as unknown as Prisma.JsonObject,
  });

  await transitionClinicStatus(clinicId, status);

  await writeBillingAudit({
    clinicId,
    action: 'webhook_processed',
    recordId: event.id,
    payload: {
      status,
      duplicate: persisted.duplicate,
      provider: BILLING_PROVIDER,
      type: event.type,
    },
  });

  return {
    eventId: persisted.event.id,
    clinicId,
    duplicate: persisted.duplicate,
    status,
    stripeEventType: event.type,
  };
}

export async function reconcileBillingStates(now = new Date()) {
  const graceEnd = addGraceDays(now);
  const expiredTrialClinics = await prisma.clinic.findMany({
    where: {
      status: ClinicStatus.trial,
      trial_end: {
        lt: now,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  const expiredTrialUpdate = await prisma.clinic.updateMany({
    where: {
      status: ClinicStatus.trial,
      trial_end: {
        lt: now,
      },
    },
    data: {
      status: ClinicStatus.past_due,
      grace_end: graceEnd,
    },
  });

  await Promise.all(
    expiredTrialClinics.map((clinic) =>
      writeBillingAudit({
        clinicId: clinic.id,
        action: 'reconcile_trial_expired',
        payload: {
          previous_status: clinic.status,
          next_status: 'past_due',
          grace_end: graceEnd.toISOString(),
        },
      })
    )
  );

  const expiredGraceCount = await prisma.clinic.count({
    where: {
      status: ClinicStatus.past_due,
      grace_end: {
        lt: now,
      },
    },
  });

  return {
    transitionedTrials: expiredTrialUpdate.count,
    pastDueOutOfGrace: expiredGraceCount,
    checkedAt: now.toISOString(),
  };
}
