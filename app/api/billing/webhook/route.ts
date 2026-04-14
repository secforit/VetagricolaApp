import { NextRequest, NextResponse } from 'next/server';
import { constructVerifiedStripeEvent, processBillingWebhookEvent } from '@/lib/billing';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  let event;
  try {
    event = constructVerifiedStripeEvent(rawBody, signature);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Semnatura webhook invalida.',
      },
      { status: 401 }
    );
  }

  try {
    const result = await processBillingWebhookEvent(event);
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nu am putut procesa webhook-ul de billing.';

    if (
      message.includes('clinic_id is missing') ||
      message.includes('Clinica din webhook nu exista.')
    ) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: message,
      });
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 }
    );
  }
}
